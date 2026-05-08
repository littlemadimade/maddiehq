class RateLimiter
  def initialize(limit:, window_seconds:)
    @limit = limit
    @window_seconds = window_seconds
    @store = {}
  end

  def check!(request)
    key = client_key(request)
    now = Time.now.to_f
    window_start = now - @window_seconds

    @store[key] ||= []
    @store[key].reject! { |t| t <= window_start }

    if @store[key].length >= @limit
      retry_after = (@store[key].first + @window_seconds - now).ceil
      raise RateLimitExceeded.new(retry_after)
    end

    @store[key] << now
  end

  # Clean up expired entries to prevent memory growth
  def cleanup!
    now = Time.now.to_f
    window_start = now - @window_seconds
    @store.each do |key, timestamps|
      timestamps.reject! { |t| t <= window_start }
      @store.delete(key) if timestamps.empty?
    end
  end

  class << self
    def api
      @api ||= new(
        limit: ENV.fetch("RATE_LIMIT_API", 60).to_i,
        window_seconds: ENV.fetch("RATE_LIMIT_WINDOW_MS", 60000).to_i / 1000.0
      )
    end

    def auth
      @auth ||= new(
        limit: ENV.fetch("RATE_LIMIT_AUTH", 5).to_i,
        window_seconds: ENV.fetch("RATE_LIMIT_WINDOW_MS", 60000).to_i / 1000.0
      )
    end
  end

  private

  def client_key(request)
    request.headers["X-Forwarded-For"]&.split(",")&.first&.strip ||
      request.headers["X-Real-Ip"] ||
      request.remote_ip
  end
end

class RateLimitExceeded < StandardError
  attr_reader :retry_after

  def initialize(retry_after)
    @retry_after = retry_after
    super("Too many requests")
  end
end
