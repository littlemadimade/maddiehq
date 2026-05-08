module Api
  class BaseController < ApplicationController
    skip_before_action :verify_authenticity_token

    # NOTE: rescue_from handlers are matched in reverse declaration order,
    # so the most general (StandardError) must be declared FIRST to have
    # lowest priority, and more specific handlers declared AFTER.
    rescue_from StandardError do |e|
      Rails.logger.error("Unhandled error: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
      render json: { error: "Internal server error", code: "INTERNAL_ERROR" }, status: :internal_server_error
    end

    rescue_from Errors::AppError do |e|
      render json: { error: e.message, code: e.code }, status: e.status_code
    end

    rescue_from ActiveRecord::RecordNotFound do |e|
      render json: { error: "Not found", code: "NOT_FOUND" }, status: :not_found
    end

    rescue_from ActionController::ParameterMissing do |e|
      render json: { error: e.message, code: "BAD_REQUEST" }, status: :bad_request
    end

    private

    # Stub -- will be unified with ApplicationController auth in integration
    def current_user
      @current_user ||= begin
        token = cookies.signed[:session_token] || request.headers["Authorization"]&.delete_prefix("Bearer ")
        return nil unless token
        session = Session.active.find_by(token: token)
        user = session&.user
        # Reject disabled users — their sessions should not work
        return nil if user&.disabled?
        user
      end
    end

    def authenticate_user!
      raise Errors::UnauthorizedError unless current_user
    end

    def rate_limit_api!
      RateLimiter.api.check!(request)
    rescue RateLimitExceeded => e
      render json: { error: "Too many requests" }, status: :too_many_requests,
             headers: { "Retry-After" => e.retry_after.to_s }
    end

    def rate_limit_auth!
      RateLimiter.auth.check!(request)
    rescue RateLimitExceeded => e
      render json: { error: "Too many requests" }, status: :too_many_requests,
             headers: { "Retry-After" => e.retry_after.to_s }
    end
  end
end
