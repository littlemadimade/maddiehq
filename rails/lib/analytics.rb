# Pluggable analytics abstraction.
#
# Server-side event tracking with swappable backends.
# Set ANALYTICS_PROVIDER in your environment:
#   - "posthog"   — PostHog (requires POSTHOG_API_KEY + POSTHOG_HOST)
#   - "plausible"  — Plausible (requires PLAUSIBLE_DOMAIN)
#   - "console"    — Logs to stdout (default in development)
#   - "none"       — Silent (default in production if no provider set)
#
# Usage:
#   Analytics.track("item.created", { item_id: "123" }, user_id: "abc")
#   Analytics.identify("abc", { email: "user@example.com", plan: "pro" })

require "net/http"
require "json"

module Analytics
  module_function

  def track(event, properties = {}, user_id: nil)
    provider.track(event, properties, user_id: user_id)
  end

  def identify(user_id, traits = {})
    provider.identify(user_id, traits)
  end

  def provider
    @provider ||= build_provider
  end

  def build_provider
    name = ENV["ANALYTICS_PROVIDER"] || (Rails.env.development? ? "console" : "none")

    case name
    when "posthog"
      PostHogProvider.new
    when "plausible"
      PlausibleProvider.new
    when "console"
      ConsoleProvider.new
    else
      NoopProvider.new
    end
  end

  # ── Providers ──────────────────────────────────────────────────────────────

  class NoopProvider
    def track(event, properties = {}, user_id: nil); end
    def identify(user_id, traits = {}); end
  end

  class ConsoleProvider
    def track(event, properties = {}, user_id: nil)
      Rails.logger.debug("[analytics] track: #{event} #{properties.inspect}")
    end

    def identify(user_id, traits = {})
      Rails.logger.debug("[analytics] identify: #{user_id} #{traits.inspect}")
    end
  end

  class PostHogProvider
    def initialize
      @api_key = ENV["POSTHOG_API_KEY"]
      @host = ENV["POSTHOG_HOST"] || "https://app.posthog.com"

      unless @api_key
        Rails.logger.warn("[analytics] POSTHOG_API_KEY not set, falling back to console")
        @fallback = ConsoleProvider.new
      end
    end

    def track(event, properties = {}, user_id: nil)
      return @fallback.track(event, properties, user_id: user_id) if @fallback

      post("/capture/", {
        api_key: @api_key,
        event: event,
        properties: properties.merge(distinct_id: user_id || "anonymous"),
        timestamp: Time.current.iso8601,
      })
    end

    def identify(user_id, traits = {})
      return @fallback.identify(user_id, traits) if @fallback

      post("/capture/", {
        api_key: @api_key,
        event: "$identify",
        properties: { distinct_id: user_id, "$set": traits },
      })
    end

    private

    def post(path, body)
      uri = URI("#{@host}#{path}")
      req = Net::HTTP::Post.new(uri, "Content-Type" => "application/json")
      req.body = body.to_json
      Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(req) }
    rescue => e
      Rails.logger.warn("[analytics] PostHog request failed: #{e.message}")
    end
  end

  class PlausibleProvider
    def initialize
      @domain = ENV["PLAUSIBLE_DOMAIN"]
      @host = ENV["PLAUSIBLE_HOST"] || "https://plausible.io"

      unless @domain
        Rails.logger.warn("[analytics] PLAUSIBLE_DOMAIN not set, falling back to console")
        @fallback = ConsoleProvider.new
      end
    end

    def track(event, properties = {}, user_id: nil)
      return @fallback.track(event, properties, user_id: user_id) if @fallback

      uri = URI("#{@host}/api/event")
      req = Net::HTTP::Post.new(uri, "Content-Type" => "application/json")
      req.body = { domain: @domain, name: event, props: properties }.to_json
      Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(req) }
    rescue => e
      Rails.logger.warn("[analytics] Plausible request failed: #{e.message}")
    end

    def identify(user_id, traits = {})
      # Plausible is privacy-focused — no user identification
    end
  end
end
