module MarkdownHelper
  BLOG_DIR = Rails.root.join("content", "blog")
  CHANGELOG_PATH = Rails.root.join("content", "changelog", "changelog.md")

  class << self
    def renderer
      @renderer ||= Redcarpet::Markdown.new(
        Redcarpet::Render::HTML.new(
          hard_wrap: true,
          link_attributes: { target: "_blank", rel: "noopener" }
        ),
        autolink: true,
        tables: true,
        fenced_code_blocks: true,
        strikethrough: true,
        highlight: true,
        no_intra_emphasis: true
      )
    end

    def render_markdown(content)
      html = renderer.render(content)
      Rails::HTML5::SafeListSanitizer.new.sanitize(
        html,
        tags: %w[h1 h2 h3 h4 h5 h6 p a ul ol li blockquote pre code em strong del br hr table thead tbody tr th td img span div],
        attributes: %w[href src alt title target rel class id lang]
      ).html_safe
    end

    def reading_time(content)
      words = content.split.length
      minutes = (words / 200.0).ceil
      "#{minutes} min read"
    end

    def all_posts
      return [] unless BLOG_DIR.exist?

      Dir.glob(BLOG_DIR.join("*.md")).map do |file|
        slug = File.basename(file, ".md")
        parse_post(file, slug)
      end.compact.select { |p| p[:published] }.sort_by { |p| p[:date] }.reverse
    end

    def get_post(slug)
      file = BLOG_DIR.join("#{slug}.md")
      return nil unless file.exist?

      post = parse_post(file.to_s, slug)
      return nil unless post && post[:published]
      post
    end

    def all_tags
      all_posts.flat_map { |p| p[:tags] }.uniq.sort
    end

    def get_changelog
      return { content: "No changelog entries yet." } unless CHANGELOG_PATH.exist?

      raw = File.read(CHANGELOG_PATH)
      parsed = FrontMatterParser::Parser.new(:md).call(raw)
      { content: parsed.content }
    end

    private

    def parse_post(file, slug)
      raw = File.read(file)
      parsed = FrontMatterParser::Parser.new(:md).call(raw)
      fm = parsed.front_matter

      {
        slug: slug,
        title: fm["title"] || slug,
        date: fm["date"] || "",
        excerpt: fm["excerpt"] || "",
        author: fm["author"] || "The MaddieHQ Team",
        tags: fm["tags"] || [],
        published: fm["published"] != false,
        reading_time: reading_time(parsed.content),
        content: parsed.content
      }
    end
  end
end
