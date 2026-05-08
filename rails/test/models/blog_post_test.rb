require "test_helper"

class BlogPostTest < ActiveSupport::TestCase
  # ── Validations ──

  test "valid blog post with all required fields" do
    post = BlogPost.new(
      title: "Test Post",
      slug: "test-post",
      content: "Some content here."
    )
    assert post.valid?
  end

  test "title is required" do
    post = BlogPost.new(slug: "no-title", content: "Content")
    assert_not post.valid?
    assert_includes post.errors[:title], "can't be blank"
  end

  test "slug is required when no title for auto-generation" do
    post = BlogPost.new(content: "Content only")
    assert_not post.valid?
    assert_includes post.errors[:slug], "can't be blank"
  end

  test "content is required" do
    post = BlogPost.new(title: "No Content", slug: "no-content")
    assert_not post.valid?
    assert_includes post.errors[:content], "can't be blank"
  end

  test "slug must be unique" do
    existing = blog_posts(:published_post)
    post = BlogPost.new(
      title: "Duplicate Slug",
      slug: existing.slug,
      content: "Content"
    )
    assert_not post.valid?
    assert_includes post.errors[:slug], "has already been taken"
  end

  test "status must be draft, published, or archived" do
    post = BlogPost.new(
      title: "Bad Status",
      slug: "bad-status",
      content: "Content",
      status: "invalid"
    )
    assert_not post.valid?
    assert_includes post.errors[:status], "is not included in the list"
  end

  # ── Auto-slug Generation ──

  test "auto-generates slug from title when slug is blank" do
    post = BlogPost.create!(
      title: "My Awesome Blog Post",
      content: "Content here"
    )
    assert_equal "my-awesome-blog-post", post.slug
  end

  test "does not overwrite explicit slug" do
    post = BlogPost.create!(
      title: "My Post",
      slug: "custom-slug",
      content: "Content"
    )
    assert_equal "custom-slug", post.slug
  end

  # ── tags_list ──

  test "tags_list parses JSON array" do
    post = blog_posts(:draft_post)
    assert_equal ["rails", "testing"], post.tags_list
  end

  test "tags_list returns empty array when tags is blank" do
    post = BlogPost.new(tags: nil)
    assert_equal [], post.tags_list
  end

  test "tags_list falls back to comma-separated parsing" do
    post = BlogPost.new(tags: "ruby, rails, testing")
    assert_equal ["ruby", "rails", "testing"], post.tags_list
  end

  test "tags_list= stores array as JSON" do
    post = BlogPost.new
    post.tags_list = ["one", "two"]
    assert_equal '["one","two"]', post.tags
  end

  # ── reading_time ──

  test "reading_time returns minimum 1 min for short content" do
    post = BlogPost.new(content: "Short.")
    assert_equal "1 min read", post.reading_time
  end

  test "reading_time calculates based on 200 wpm" do
    # 400 words should be 2 min read
    words = (["word"] * 400).join(" ")
    post = BlogPost.new(content: words)
    assert_equal "2 min read", post.reading_time
  end

  test "reading_time rounds up" do
    # 201 words = ceil(201/200) = 2 min
    words = (["word"] * 201).join(" ")
    post = BlogPost.new(content: words)
    assert_equal "2 min read", post.reading_time
  end

  # ── Scopes ──

  test "published scope returns only published posts with published_at" do
    published = BlogPost.published
    assert_includes published, blog_posts(:published_post)
    assert_not_includes published, blog_posts(:draft_post)
  end

  test "drafts scope returns only draft posts" do
    drafts = BlogPost.drafts
    assert_includes drafts, blog_posts(:draft_post)
    assert_not_includes drafts, blog_posts(:published_post)
  end

  # ── Association ──

  test "belongs to author (User)" do
    post = blog_posts(:published_post)
    assert_equal users(:admin), post.author
  end

  test "author is optional" do
    post = BlogPost.new(
      title: "No Author",
      slug: "no-author",
      content: "Content"
    )
    assert post.valid?
  end
end
