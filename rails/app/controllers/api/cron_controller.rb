require_relative "../../../lib/job_queue"

module Api
  class CronController < ApplicationController
    skip_before_action :verify_authenticity_token

    # POST /api/cron
    def create
      # Always require CRON_SECRET — reject if not configured
      unless ENV['CRON_SECRET'].present?
        return render json: { error: 'CRON_SECRET not configured' }, status: :service_unavailable
      end

      token = request.headers['Authorization']&.delete_prefix('Bearer ')&.strip
      unless token == ENV['CRON_SECRET']
        return render json: { error: 'Unauthorized' }, status: :unauthorized
      end

      results = JobQueue.process
      render json: { data: results }
    end
  end
end
