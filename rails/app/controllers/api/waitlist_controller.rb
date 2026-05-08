module Api
  class WaitlistController < BaseController
    skip_before_action :verify_authenticity_token
    before_action :rate_limit_auth!, only: [:join]

    # POST /api/waitlist/join
    def join
      email = params[:email]&.strip&.downcase
      referred_by = params[:referralCode]

      unless email.present? && email.match?(URI::MailTo::EMAIL_REGEXP)
        return render json: { error: "Valid email is required" }, status: :bad_request
      end

      entry = Waitlist.find_or_initialize_by(email: email)
      if entry.persisted?
        return render json: {
          data: { position: Waitlist.waiting.where("id <= ?", entry.id).count, referralCode: entry.referral_code }
        }
      end

      entry.referred_by = referred_by
      if entry.save
        # Increment referrer's count
        if referred_by.present?
          Waitlist.where(referral_code: referred_by).update_all("referral_count = referral_count + 1")
        end

        position = Waitlist.waiting.where("id <= ?", entry.id).count
        render json: { data: { position: position, referralCode: entry.referral_code } }, status: :created
      else
        render json: { error: entry.errors.full_messages.join(", ") }, status: :unprocessable_entity
      end
    end

    # GET /api/waitlist/status?email=...
    def status
      email = params[:email]&.strip&.downcase
      entry = Waitlist.find_by(email: email)

      unless entry
        return render json: { error: "Not found" }, status: :not_found
      end

      position = entry.status == "waiting" ? Waitlist.waiting.where("id <= ?", entry.id).count : nil
      render json: {
        data: {
          status: entry.status,
          position: position,
          referralCode: entry.referral_code,
          referralCount: entry.referral_count,
        }
      }
    end

    # POST /api/waitlist/validate-invite
    def validate_invite
      code = params[:code]&.strip
      invite = InviteCode.find_by(code: code)

      unless invite&.available?
        return render json: { valid: false }
      end

      render json: { valid: true, email: invite.email }
    end

    # POST /api/waitlist/redeem-invite
    def redeem_invite
      authenticate_user!

      code = params[:code]&.strip
      invite = InviteCode.available.find_by(code: code)

      unless invite
        return render json: { error: "Invalid or expired invite code" }, status: :bad_request
      end

      invite.redeem!(current_user)
      render json: { data: { success: true } }
    end
  end
end
