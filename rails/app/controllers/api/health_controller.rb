module Api
  class HealthController < ApplicationController
    skip_before_action :verify_authenticity_token

    def show
      db_ok = begin
        ActiveRecord::Base.connection.execute("SELECT 1")
        true
      rescue StandardError
        false
      end

      render json: {
        ok: true,
        db: db_ok,
        timestamp: Time.current.iso8601
      }
    end
  end
end
