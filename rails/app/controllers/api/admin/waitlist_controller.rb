module Api
  module Admin
    class WaitlistController < BaseController
      before_action -> { require_permission!("admin:waitlist") }

      def index
        page = page_param
        per_page = per_page_param(50)
        status_filter = params[:status]

        scope = Waitlist.all
        scope = scope.where(status: status_filter) if status_filter.present?
        scope = scope.order(created_at: :desc)

        total = scope.count
        entries = scope.offset((page - 1) * per_page).limit(per_page)

        render json: {
          data: entries.map { |e| waitlist_json(e) },
          total: total,
          page: page,
          limit: per_page,
        }
      end

      # POST /api/admin/waitlist/invite
      def invite
        email = params[:email]&.strip&.downcase
        entry = Waitlist.find_by(email: email)

        unless entry
          return render json: { error: "Email not on waitlist" }, status: :not_found
        end

        # Generate invite code
        invite_code = InviteCode.create!(
          email: email,
          created_by: current_user,
        )

        # Mark as invited
        entry.update!(status: "invited", invited_at: Time.current)

        # Send invite email
        begin
          AppMailer.waitlist_invite_email(email, invite_code.code).deliver_later
        rescue => e
          Rails.logger.warn("[waitlist] Failed to send invite email: #{e.message}")
        end

        log_action("waitlist_invite", target_type: "waitlist", target_id: email,
                   details: { code: invite_code.code })

        render json: { data: { success: true, code: invite_code.code } }
      end

      private

      def waitlist_json(entry)
        {
          id: entry.id,
          email: entry.email,
          status: entry.status,
          referralCode: entry.referral_code,
          referralCount: entry.referral_count,
          referredBy: entry.referred_by,
          invitedAt: entry.invited_at,
          createdAt: entry.created_at,
        }
      end
    end
  end
end
