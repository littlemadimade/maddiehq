module Errors
  class AppError < StandardError
    attr_reader :status_code, :code

    def initialize(message, status_code, code)
      super(message)
      @status_code = status_code
      @code = code
    end
  end

  class BadRequestError < AppError
    def initialize(message = "Bad request")
      super(message, 400, "BAD_REQUEST")
    end
  end

  class UnauthorizedError < AppError
    def initialize(message = "Not authenticated")
      super(message, 401, "UNAUTHORIZED")
    end
  end

  class ForbiddenError < AppError
    def initialize(message = "Forbidden")
      super(message, 403, "FORBIDDEN")
    end
  end

  class NotFoundError < AppError
    def initialize(message = "Not found")
      super(message, 404, "NOT_FOUND")
    end
  end

  class ConflictError < AppError
    def initialize(message = "Conflict")
      super(message, 409, "CONFLICT")
    end
  end

  class RateLimitError < AppError
    def initialize(message = "Too many requests")
      super(message, 429, "RATE_LIMITED")
    end
  end

  class InternalError < AppError
    def initialize(message = "Internal server error")
      super(message, 500, "INTERNAL_ERROR")
    end
  end
end
