module JobQueue
  @handlers = {}

  # Register a handler for a job type
  def self.register(job_type, &handler)
    @handlers[job_type.to_s] = handler
  end

  # Enqueue a job
  def self.enqueue(job_type, payload: {}, scheduled_at: Time.current)
    Job.create!(
      job_type: job_type.to_s,
      payload: payload.to_json,
      status: 'pending',
      scheduled_at: scheduled_at
    )
  end

  # Process pending jobs
  def self.process(limit: 10)
    results = { processed: 0, failed: 0 }

    jobs = Job.where(status: 'pending')
              .where('scheduled_at <= ?', Time.current)
              .where('attempts < max_attempts')
              .order(:scheduled_at)
              .limit(limit)

    jobs.each do |job|
      handler = @handlers[job.job_type]

      unless handler
        Rails.logger.warn("[JobQueue] No handler registered for job type: #{job.job_type}")
        job.update!(status: 'failed', last_error: "No handler registered for job type: #{job.job_type}")
        results[:failed] += 1
        next
      end

      begin
        job.update!(status: 'running', started_at: Time.current, attempts: job.attempts + 1)

        parsed_payload = JSON.parse(job.payload) rescue {}
        handler.call(parsed_payload)

        job.update!(status: 'completed', completed_at: Time.current)
        results[:processed] += 1
        Rails.logger.info("[JobQueue] Completed job ##{job.id} (#{job.job_type})")
      rescue => e
        Rails.logger.error("[JobQueue] Failed job ##{job.id} (#{job.job_type}): #{e.message}")
        job.update!(last_error: e.message)

        if job.attempts >= job.max_attempts
          job.update!(status: 'failed')
        else
          # Exponential backoff: 30s, 120s, 270s, ...
          backoff = 30 * (job.attempts ** 2)
          job.update!(status: 'pending', scheduled_at: Time.current + backoff.seconds)
        end

        results[:failed] += 1
      end
    end

    results
  end

  # Get registered job types
  def self.registered_types
    @handlers.keys
  end

  # Reset handlers (useful for testing)
  def self.reset!
    @handlers = {}
  end
end
