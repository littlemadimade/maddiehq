class BlogController < ApplicationController
  # GET /blog
  def index
    @posts = BlogPost.published.recent
    @tag = params[:tag]

    if @tag.present?
      @posts = @posts.where("tags LIKE ?", "%#{@tag}%")
    end

    respond_to do |format|
      format.html
      format.json { render json: { posts: @posts.map { |p| post_json(p) } } }
    end
  end

  # GET /blog/:slug
  def show
    @post = BlogPost.published.find_by!(slug: params[:slug])

    respond_to do |format|
      format.html
      format.json { render json: { post: post_json(@post, include_content: true) } }
    end
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { redirect_to blog_index_path, alert: "Post not found" }
      format.json { render json: { error: "Not found" }, status: :not_found }
    end
  end

  private

  def post_json(post, include_content: false)
    data = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.content.to_s.truncate(200),
      author: post.author&.name || post.author&.email || "The MaddieHQ Team",
      tags: post.tags_list,
      date: post.published_at&.strftime("%Y-%m-%d"),
      reading_time: post.reading_time,
      status: post.status
    }
    data[:content] = post.content if include_content
    data
  end
end
