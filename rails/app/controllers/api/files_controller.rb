module Api
  class FilesController < BaseController
    before_action :authenticate_user!
    before_action :rate_limit_api!, only: [:create]

    ALLOWED_CONTENT_TYPES = %w[
      image/jpeg image/png image/gif image/webp
      application/pdf
      text/plain text/csv
      application/json
      application/zip application/gzip
    ].freeze

    def index
      files = current_user.uploaded_files.order(created_at: :desc)
      render json: { files: files }
    end

    def show
      file = current_user.uploaded_files.find_by!(key: params[:key])
      data = StorageClient.download(file.key)

      # Sanitize filename for Content-Disposition header
      safe_filename = file.filename.gsub(/["\r\n]/, "_")

      send_data data,
        type: file.content_type,
        disposition: 'inline',
        filename: safe_filename
      response.headers['X-Content-Type-Options'] = 'nosniff'
    end

    def create
      uploaded = params[:file]
      raise Errors::BadRequestError, "No file provided" unless uploaded

      max_size = 10 * 1024 * 1024
      raise Errors::BadRequestError, "File too large (max 10MB)" if uploaded.size > max_size

      unless ALLOWED_CONTENT_TYPES.include?(uploaded.content_type)
        raise Errors::BadRequestError, "File type not allowed"
      end

      key = StorageClient.generate_key(uploaded.original_filename)
      StorageClient.upload(key, uploaded.read, uploaded.content_type)

      file = current_user.uploaded_files.create!(
        key: key,
        filename: uploaded.original_filename,
        content_type: uploaded.content_type,
        size: uploaded.size,
        storage_backend: StorageClient.backend_name
      )

      render json: { file: file, url: StorageClient.url(key) }, status: :created
    end

    def destroy
      file = current_user.uploaded_files.find_by!(key: params[:key])
      StorageClient.delete(file.key)
      file.destroy!
      render json: { ok: true }
    end
  end
end
