# In-process pub/sub for real-time SSE delivery.
#
# Uses an in-memory Hash of channel => subscriber IO objects.
# Works for single-process deployments (Puma single mode).
#
# Usage:
#   Realtime.publish("notifications:user123", { type: "new-notification", data: { ... } })

module Realtime
  @channels = {}
  @mutex = Mutex.new

  def self.subscribe(channel)
    @mutex.synchronize do
      @channels[channel] ||= Set.new
    end
  end

  def self.add_subscriber(channel, stream)
    @mutex.synchronize do
      @channels[channel] ||= Set.new
      @channels[channel].add(stream)
    end
  end

  def self.remove_subscriber(channel, stream)
    @mutex.synchronize do
      return unless @channels[channel]
      @channels[channel].delete(stream)
      @channels.delete(channel) if @channels[channel].empty?
    end
  end

  def self.publish(channel, data)
    subscribers = @mutex.synchronize { @channels[channel]&.dup }
    return unless subscribers&.any?

    message = "data: #{data.to_json}\n\n"

    subscribers.each do |stream|
      begin
        stream.write(message)
      rescue => e
        Rails.logger.debug("[realtime] Removing dead subscriber: #{e.message}")
        remove_subscriber(channel, stream)
      end
    end
  end

  def self.subscriber_count(channel)
    @mutex.synchronize { @channels[channel]&.size || 0 }
  end
end
