module Api
  module Admin
    class BlogController < BaseController
      before_action -> { require_permission!("admin:crm") }

      # GET /api/admin/blog
      def index
        page = page_param
        limit = per_page_param
        offset = (page - 1) * limit

        scope = BlogPost.left_joins(:author)
        scope = scope.where(status: params[:status]) if params[:status].present?

        total = scope.count

        posts = scope.select(
          "blog_posts.id, blog_posts.title, blog_posts.slug, blog_posts.status, " \
          "blog_posts.author_id, users.email AS author_email, " \
          "blog_posts.published_at, blog_posts.created_at, blog_posts.updated_at"
        ).order("blog_posts.created_at DESC").limit(limit).offset(offset)

        data = posts.map do |p|
          {
            id: p.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            author_id: p.author_id,
            author_email: p.author_email,
            published_at: p.published_at&.iso8601,
            created_at: p.created_at.iso8601,
            updated_at: p.updated_at.iso8601
          }
        end

        render json: { data: data, total: total, page: page, limit: limit }
      end

      # POST /api/admin/blog
      def create
        title = params[:title]
        slug = params[:slug]
        content = params[:content]
        status_val = params[:status]

        unless title.present? && slug.present? && content.present?
          return render json: { error: "title, slug, and content are required" }, status: :bad_request
        end

        post_status = status_val == "published" ? "published" : "draft"
        published_at = post_status == "published" ? Time.current : nil

        post = BlogPost.new(
          title: title,
          slug: slug,
          content: content,
          status: post_status,
          author_id: current_user.id,
          published_at: published_at
        )

        unless post.save
          if post.errors[:slug].any?
            return render json: { error: "Slug already exists" }, status: :conflict
          end
          return render json: { error: post.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end

        log_action(
          "blog_post_create",
          target_type: "blog_post",
          target_id: post.slug,
          details: { title: title, status: post_status }
        )

        render json: { data: post_json(post) }, status: :created
      end

      # GET /api/admin/blog/:id
      def show
        post = BlogPost.find_by(id: params[:id])
        return render json: { error: "Post not found" }, status: :not_found unless post

        render json: { data: post_json(post, include_author_email: true) }
      end

      # PATCH /api/admin/blog/:id
      def update
        post = BlogPost.find_by(id: params[:id])
        return render json: { error: "Post not found" }, status: :not_found unless post

        post.title = params[:title] if params[:title].present?
        post.slug = params[:slug] if params[:slug].present?
        post.content = params[:content] if params[:content].present?

        if params[:status].present?
          new_status = params[:status] == "published" ? "published" : "draft"
          if new_status == "published" && post.status != "published"
            post.published_at = Time.current
          elsif new_status == "draft"
            post.published_at = nil
          end
          post.status = new_status
        end

        unless post.save
          if post.errors[:slug].any?
            return render json: { error: "Slug already exists" }, status: :conflict
          end
          return render json: { error: post.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end

        log_action(
          "blog_post_update",
          target_type: "blog_post",
          target_id: post.id.to_s,
          details: { title: post.title, status: post.status }
        )

        render json: { data: post_json(post) }
      end

      # POST /api/admin/blog/preview
      def preview
        content = params[:content] || ""
        html = MarkdownHelper.render_markdown(content)
        render json: { html: html }
      end

      # DELETE /api/admin/blog/:id
      def destroy
        post = BlogPost.find_by(id: params[:id])
        return render json: { error: "Post not found" }, status: :not_found unless post

        title = post.title
        post.destroy!

        log_action(
          "blog_post_delete",
          target_type: "blog_post",
          target_id: params[:id],
          details: { title: title }
        )

        render json: { data: { deleted: true } }
      end

      private

      def post_json(post, include_author_email: false)
        data = {
          id: post.id,
          title: post.title,
          slug: post.slug,
          content: post.content,
          status: post.status,
          author_id: post.author_id,
          published_at: post.published_at&.iso8601,
          created_at: post.created_at.iso8601,
          updated_at: post.updated_at.iso8601
        }

        if include_author_email
          data[:author_email] = post.author&.email
        end

        data
      end
    end
  end
end
