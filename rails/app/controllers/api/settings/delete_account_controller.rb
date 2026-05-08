module Api
  module Settings
    class DeleteAccountController < BaseController
      # POST /api/settings/delete-account
      def create
        confirmation = params[:confirmation]

        unless confirmation == "DELETE"
          render json: { error: 'Please type "DELETE" to confirm account deletion' }, status: :bad_request
          return
        end

        user = current_user

        # Delete in order respecting foreign keys (though CASCADE should handle this)
        user.items.destroy_all
        user.two_factor&.destroy
        user.sessions.destroy_all
        user.accounts.destroy_all
        Verification.where(identifier: user.email).destroy_all
        user.destroy!

        cookies.delete(:session_token)

        render json: { success: true }
      rescue => e
        Rails.logger.error("Delete account error: #{e.message}")
        render json: { error: "Failed to delete account" }, status: :internal_server_error
      end
    end
  end
end
