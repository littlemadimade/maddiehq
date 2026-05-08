module NotificationService
  def self.create(user_id:, type: 'info', title:, message: '')
    Notification.create!(
      user_id: user_id,
      notification_type: type,
      title: title,
      message: message
    )
  end

  def self.unread_count(user_id)
    Notification.where(user_id: user_id, read: false).count
  end

  def self.mark_read(user_id, notification_id)
    n = Notification.find_by(id: notification_id, user_id: user_id)
    return false unless n
    n.update!(read: true)
    true
  end

  def self.mark_all_read(user_id)
    Notification.where(user_id: user_id, read: false).update_all(read: true)
  end
end
