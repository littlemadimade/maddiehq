class Api::Auth::OauthController < ApplicationController
  skip_before_action :verify_authenticity_token
  wrap_parameters false

  PROVIDERS = {
    "google" => {
      authorize_url: "https://accounts.google.com/o/oauth2/v2/auth",
      token_url: "https://oauth2.googleapis.com/token",
      userinfo_url: "https://www.googleapis.com/oauth2/v2/userinfo",
      scope: "openid email profile",
      client_id_env: "GOOGLE_CLIENT_ID",
      client_secret_env: "GOOGLE_CLIENT_SECRET"
    },
    "github" => {
      authorize_url: "https://github.com/login/oauth/authorize",
      token_url: "https://github.com/login/oauth/access_token",
      userinfo_url: "https://api.github.com/user",
      emails_url: "https://api.github.com/user/emails",
      scope: "user:email",
      client_id_env: "GITHUB_CLIENT_ID",
      client_secret_env: "GITHUB_CLIENT_SECRET"
    },
    "apple" => {
      authorize_url: "https://appleid.apple.com/auth/authorize",
      token_url: "https://appleid.apple.com/auth/token",
      scope: "name email",
      client_id_env: "APPLE_CLIENT_ID",
      client_secret_env: "APPLE_CLIENT_SECRET",
      response_mode: "form_post"
    },
    "facebook" => {
      authorize_url: "https://www.facebook.com/v18.0/dialog/oauth",
      token_url: "https://graph.facebook.com/v18.0/oauth/access_token",
      userinfo_url: "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)",
      scope: "email public_profile",
      client_id_env: "FACEBOOK_CLIENT_ID",
      client_secret_env: "FACEBOOK_CLIENT_SECRET"
    },
    "microsoft" => {
      authorize_url: "https://login.microsoftonline.com/%{tenant}/oauth2/v2.0/authorize",
      token_url: "https://login.microsoftonline.com/%{tenant}/oauth2/v2.0/token",
      userinfo_url: "https://graph.microsoft.com/v1.0/me",
      scope: "openid email profile User.Read",
      client_id_env: "MICROSOFT_CLIENT_ID",
      client_secret_env: "MICROSOFT_CLIENT_SECRET",
      tenant_env: "MICROSOFT_TENANT_ID",
      default_tenant: "common"
    }
  }.freeze

  def redirect
    provider = params[:provider]
    config = PROVIDERS[provider]
    return render json: { error: "Unsupported provider" }, status: :bad_request unless config

    client_id = ENV[config[:client_id_env]]
    return render json: { error: "Provider not configured" }, status: :not_implemented unless client_id.present?

    state = SecureRandom.hex(16)
    cookies.signed[:oauth_state] = { value: state, expires: 10.minutes.from_now, httponly: true, same_site: :lax }

    callback_url = "#{helpers.app_url}/api/auth/oauth/#{provider}/callback"

    authorize_url = config[:authorize_url]
    if provider == "microsoft"
      tenant = ENV.fetch(config[:tenant_env], config[:default_tenant])
      authorize_url = authorize_url % { tenant: tenant }
    end

    auth_url = "#{authorize_url}?client_id=#{client_id}&redirect_uri=#{CGI.escape(callback_url)}&scope=#{CGI.escape(config[:scope])}&state=#{state}&response_type=code"
    auth_url += "&prompt=select_account" if provider == "google"
    auth_url += "&response_mode=form_post" if config[:response_mode] == "form_post"

    redirect_to auth_url, allow_other_host: true
  end

  # Apple uses form_post, so callback comes as POST
  alias_method :callback_post, :callback

  def callback
    provider = params[:provider]
    config = PROVIDERS[provider]
    return redirect_to "/auth?error=unsupported_provider" unless config

    state = cookies.signed[:oauth_state]
    cookies.delete(:oauth_state)
    return redirect_to "/auth?error=invalid_state" unless state.present? && state == params[:state]

    code = params[:code]
    return redirect_to "/auth?error=no_code" unless code.present?

    token_data = exchange_code(provider, config, code)
    return redirect_to "/auth?error=token_exchange_failed" unless token_data

    user_info = fetch_user_info(provider, config, token_data)
    return redirect_to "/auth?error=userinfo_failed" unless user_info

    user = find_or_create_user(provider, user_info)
    return redirect_to "/auth?error=account_linking_denied" unless user

    create_session_and_redirect(user)
  end

  private

  def exchange_code(provider, config, code)
    callback_url = "#{helpers.app_url}/api/auth/oauth/#{provider}/callback"

    token_url = config[:token_url]
    if provider == "microsoft"
      tenant = ENV.fetch(config[:tenant_env], config[:default_tenant])
      token_url = token_url % { tenant: tenant }
    end

    uri = URI(token_url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    req = Net::HTTP::Post.new(uri.path)
    req["Accept"] = "application/json"
    req.set_form_data({
      client_id: ENV[config[:client_id_env]],
      client_secret: ENV[config[:client_secret_env]],
      code: code,
      redirect_uri: callback_url,
      grant_type: "authorization_code"
    })

    response = http.request(req)
    JSON.parse(response.body)
  rescue StandardError => e
    Rails.logger.error "OAuth token exchange failed: #{e.message}"
    nil
  end

  def fetch_user_info(provider, config, token_data)
    access_token = token_data["access_token"]

    # Apple embeds user info in the id_token JWT; no userinfo endpoint
    if provider == "apple"
      return decode_apple_id_token(token_data["id_token"])
    end

    uri = URI(config[:userinfo_url])
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{access_token}"
    req["Accept"] = "application/json"
    response = http.request(req)
    info = JSON.parse(response.body)

    if provider == "github" && info["email"].blank? && config[:emails_url]
      email_uri = URI(config[:emails_url])
      email_req = Net::HTTP::Get.new(email_uri)
      email_req["Authorization"] = "Bearer #{access_token}"
      email_req["Accept"] = "application/json"
      email_http = Net::HTTP.new(email_uri.host, email_uri.port)
      email_http.use_ssl = true
      email_resp = email_http.request(email_req)
      emails = JSON.parse(email_resp.body)
      primary = emails.find { |e| e["primary"] && e["verified"] } || emails.first
      info["email"] = primary["email"] if primary
    end

    normalize_user_info(provider, info)
  rescue StandardError => e
    Rails.logger.error "OAuth userinfo fetch failed: #{e.message}"
    nil
  end

  def decode_apple_id_token(id_token)
    return nil unless id_token

    # Fetch Apple's JWKS public keys and verify the JWT signature
    jwks_raw = fetch_apple_jwks
    jwks_keys = jwks_raw["keys"].map { |k| JWT::JWK.new(k) }
    algorithms = jwks_keys.map { |k| k[:alg] || "RS256" }.uniq

    payload, _header = JWT.decode(
      id_token,
      nil, # key is resolved from JWKS
      true, # verify signature
      algorithms: algorithms,
      jwks: { keys: jwks_raw["keys"] },
      iss: "https://appleid.apple.com",
      verify_iss: true,
      aud: ENV[PROVIDERS["apple"][:client_id_env]],
      verify_aud: true
    )

    {
      provider_id: "apple",
      provider_account_id: payload["sub"],
      email: payload["email"],
      name: payload["email"]&.split("@")&.first,
      image: nil
    }
  rescue StandardError => e
    Rails.logger.error "Apple id_token verification failed: #{e.message}"
    nil
  end

  def fetch_apple_jwks
    @apple_jwks ||= begin
      uri = URI("https://appleid.apple.com/auth/keys")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      response = http.request(Net::HTTP::Get.new(uri))
      JSON.parse(response.body)
    end
  end

  def normalize_user_info(provider, info)
    case provider
    when "google"
      # Google always verifies email
      { provider_id: "google", provider_account_id: info["id"], email: info["email"], name: info["name"], image: info["picture"], email_verified: true }
    when "github"
      # GitHub primary+verified email was already selected in fetch_user_info
      { provider_id: "github", provider_account_id: info["id"].to_s, email: info["email"], name: info["name"] || info["login"], image: info["avatar_url"], email_verified: info["verified"] != false }
    when "facebook"
      { provider_id: "facebook", provider_account_id: info["id"], email: info["email"], name: info["name"], image: info.dig("picture", "data", "url"), email_verified: true }
    when "microsoft"
      { provider_id: "microsoft", provider_account_id: info["id"], email: info["mail"] || info["userPrincipalName"], name: info["displayName"], image: nil, email_verified: true }
    end
  end

  def find_or_create_user(provider, user_info)
    account = Account.find_by(provider_id: user_info[:provider_id], account_id: user_info[:provider_account_id])
    return account.user if account

    user = User.find_by(email: user_info[:email])
    if user
      # Only auto-link if the OAuth provider confirms the email is verified.
      # This prevents account takeover via unverified OAuth emails.
      unless user_info[:email_verified]
        Rails.logger.warn "[oauth] Refusing to auto-link unverified email #{user_info[:email]} from #{provider}"
        return nil
      end
    else
      user = User.create!(
        email: user_info[:email],
        name: user_info[:name],
        image: user_info[:image],
        email_verified: user_info[:email_verified] == true
      )
    end

    Account.create!(
      user: user,
      provider_id: user_info[:provider_id],
      account_id: user_info[:provider_account_id]
    )

    user
  end

  def create_session_and_redirect(user)
    session = Session.create!(
      user: user,
      expires_at: 7.days.from_now,
      ip_address: request.remote_ip,
      user_agent: request.user_agent
    )

    cookies.signed[:session_token] = {
      value: session.token,
      expires: session.expires_at,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax
    }

    redirect_to "/app"
  end
end
