module Api
  module Settings
    class AccountController < BaseController
      # GET /api/settings/account
      def show
        account = current_user.accounts.first

        render json: {
          email: current_user.email,
          provider: account&.provider_id || "credential",
          emailVerified: current_user.email_verified,
          twoFactorEnabled: current_user.two_factor_enabled,
          image: current_user.image,
          createdAt: current_user.created_at.iso8601
        }
      end

      # POST /api/settings/avatar
      def update_avatar
        image = params[:image]
        raise Errors::BadRequestError, "Image URL is required" if image.blank?

        current_user.update!(image: image)
        render json: { ok: true, image: current_user.image }
      end
    end
  end
end
