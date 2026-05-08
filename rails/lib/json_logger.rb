module JsonLogger
  LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }.freeze

  class << self
    def configured_level
      level = (ENV["LOG_LEVEL"] || "info").downcase.to_sym
      LEVELS.key?(level) ? level : :info
    end

    def should_log?(level)
      LEVELS[level] >= LEVELS[configured_level]
    end

    def emit(level, message, meta = {})
      return unless should_log?(level)

      entry = {
        level: level,
        message: message,
        timestamp: Time.now.iso8601
      }.merge(meta)

      if Rails.env.production?
        output = entry.to_json
      else
        output = "#{Time.now.strftime('%H:%M:%S')} #{level.to_s.upcase.ljust(5)} #{message}"
        output += " #{meta.to_json}" if meta.any?
      end

      case level
      when :error then Rails.logger.error(output)
      when :warn then Rails.logger.warn(output)
      else Rails.logger.info(output)
      end
    end

    def debug(message, meta = {}) = emit(:debug, message, meta)
    def info(message, meta = {}) = emit(:info, message, meta)
    def warn(message, meta = {}) = emit(:warn, message, meta)
    def error(message, meta = {}) = emit(:error, message, meta)

    def log_request(method, path, status_code, duration_ms, meta = {})
      level = status_code >= 500 ? :error : (status_code >= 400 ? :warn : :info)
      emit(level, "#{method} #{path} #{status_code} #{duration_ms}ms",
           { method: method, path: path, status_code: status_code, duration_ms: duration_ms }.merge(meta))
    end
  end
end
