require_relative "../../../../lib/job_queue"

module Api
  module Admin
    class JobsController < BaseController
      before_action -> { require_permission!("admin:settings") }

      # GET /api/admin/jobs
      def index
        jobs = if params[:status].present?
          Job.where(status: params[:status]).order(created_at: :desc).limit(50)
        else
          Job.recent
        end

        counts = {
          pending: Job.where(status: 'pending').count,
          running: Job.where(status: 'running').count,
          completed: Job.where(status: 'completed').count,
          failed: Job.where(status: 'failed').count
        }

        render json: {
          data: {
            counts: counts,
            jobs: jobs.as_json,
            registered_types: JobQueue.registered_types
          }
        }
      end

      # POST /api/admin/jobs
      def create
        job_type = params[:job_type]
        payload = params[:payload] || {}

        unless job_type.present?
          render json: { error: "job_type is required" }, status: :bad_request
          return
        end

        job = JobQueue.enqueue(job_type, payload: payload)
        log_action("enqueue_job", target_type: "Job", target_id: job.id, details: "type=#{job_type}")

        render json: { data: job.as_json }, status: :created
      end

      # POST /api/admin/jobs/process
      def process_jobs
        results = JobQueue.process
        log_action("process_jobs", details: "processed=#{results[:processed]} failed=#{results[:failed]}")

        render json: { data: results }
      end
    end
  end
end
