module Api
  class ItemsController < BaseController
    before_action :authenticate_user!
    before_action :set_item, only: [:show, :update, :destroy]

    # GET /api/items
    def index
      items = current_user.items.order(created_at: :asc)
      render json: { items: items }
    end

    # GET /api/items/:id
    def show
      render json: { item: @item }
    end

    # POST /api/items
    def create
      name = params[:name]&.strip
      raise Errors::BadRequestError, "Name is required" if name.blank?

      item = current_user.items.create!(
        name: name,
        description: params[:description]&.strip || ""
      )
      render json: { item: item }, status: :created
    end

    # PATCH /api/items/:id
    def update
      name = params[:name]&.strip
      raise Errors::BadRequestError, "Name is required" if name.blank?

      @item.update!(
        name: name,
        description: params[:description]&.strip || ""
      )
      render json: { item: @item }
    end

    # DELETE /api/items/:id
    def destroy
      @item.destroy!
      render json: { ok: true }
    end

    private

    def set_item
      @item = current_user.items.find(params[:id])
    end
  end
end
