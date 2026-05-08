module Api
  class SearchController < BaseController
    before_action :authenticate_user!

    def index
      q = params[:q]
      raise Errors::BadRequestError, "Query parameter 'q' is required" if q.blank?

      limit = (params[:limit] || 20).to_i
      results = SearchService.search_items(current_user.id, q, limit: limit)

      render json: { results: results, query: q }
    end
  end
end
