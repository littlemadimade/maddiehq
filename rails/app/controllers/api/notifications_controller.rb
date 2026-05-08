module Api
  class NotificationsController < BaseController
    before_action :authenticate_user!

    def index
      limit = (params[:limit] || 50).to_i
      offset = (params[:offset] || 0).to_i

      notifications = current_user.notifications
        .order(created_at: :desc)
        .limit(limit)
        .offset(offset)

      unread_count = NotificationService.unread_count(current_user.id)

      render json: { notifications: notifications, unreadCount: unread_count }
    end

    def mark_read
      updated = NotificationService.mark_read(current_user.id, params[:id])
      raise Errors::NotFoundError, "Notification not found" unless updated
      render json: { ok: true }
    end

    def mark_all_read
      count = NotificationService.mark_all_read(current_user.id)
      render json: { ok: true, count: count }
    end
  end
end
