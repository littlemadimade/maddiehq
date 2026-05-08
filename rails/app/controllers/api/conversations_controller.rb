module Api
  class ConversationsController < BaseController
    before_action :authenticate_user!

    # GET /api/conversations
    def index
      conversations = current_user.conversations.order(updated_at: :desc)
        .select(:id, :title, :created_at, :updated_at)
      render json: { conversations: conversations }
    end

    # POST /api/conversations
    def create
      conversation = current_user.conversations.create!(
        title: params[:title] || "New chat"
      )
      render json: { conversation: conversation.slice(:id, :title, :created_at, :updated_at) }, status: :created
    end

    # GET /api/conversations/:id
    def show
      conversation = current_user.conversations.find(params[:id])
      render json: { conversation: conversation.slice(:id, :title, :created_at, :updated_at) }
    end

    # DELETE /api/conversations/:id
    def destroy
      conversation = current_user.conversations.find(params[:id])
      conversation.destroy!
      render json: { ok: true }
    end

    # GET /api/conversations/:id/messages
    def messages
      conversation = current_user.conversations.find(params[:id])
      messages = conversation.chat_messages.order(:created_at)
        .select(:id, :role, :content, :attachments_meta, :created_at)
      render json: { messages: messages }
    end

    # POST /api/conversations/:id/messages
    def create_message
      conversation = current_user.conversations.find(params[:id])

      message = conversation.chat_messages.create!(
        role: params[:role],
        content: params[:content] || "",
        attachments_meta: params[:attachments_meta]&.to_json
      )

      conversation.touch

      # Auto-rename from first user message
      if params[:role] == "user" && conversation.title == "New chat" && params[:content].present?
        title = params[:content][0..59]
        title += "..." if params[:content].length > 60
        conversation.update!(title: title)
      end

      render json: { message: message.slice(:id, :role, :content, :attachments_meta, :created_at) }, status: :created
    end
  end
end
