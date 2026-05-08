module CronScheduler
  @schedules = {}
  @threads = {}
  @running = false

  def self.register(name, interval_seconds, &block)
    @schedules[name.to_s] = { interval: interval_seconds, handler: block }
  end

  def self.start
    return if @running
    @running = true

    @schedules.each do |name, config|
      @threads[name] = Thread.new do
        Rails.logger.info("[CronScheduler] Started cron: #{name} (every #{config[:interval]}s)")
        loop do
          sleep(config[:interval])
          break unless @running
          begin
            Rails.logger.info("[CronScheduler] Running cron: #{name}")
            config[:handler].call
          rescue => e
            Rails.logger.error("[CronScheduler] Cron #{name} failed: #{e.message}")
          end
        end
      end
    end

    Rails.logger.info("[CronScheduler] Started #{@threads.size} cron schedule(s)")
  end

  def self.stop
    @running = false
    @threads.each do |name, thread|
      Rails.logger.info("[CronScheduler] Stopping cron: #{name}")
      thread.kill
    end
    @threads = {}
  end

  def self.running?
    @running
  end

  # Reset state (useful for testing)
  def self.reset!
    stop
    @schedules = {}
  end
end
