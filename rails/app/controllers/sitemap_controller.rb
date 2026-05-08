class SitemapController < ApplicationController
  # GET /sitemap.xml
  def show
    base_url = ENV.fetch("APP_URL", "https://maddiehq.example.com")
    posts = BlogPost.published.recent

    urls = [
      { loc: base_url, changefreq: "weekly", priority: "1.0" },
      { loc: "#{base_url}/auth", changefreq: "monthly", priority: "0.8" },
      { loc: "#{base_url}/blog", changefreq: "weekly", priority: "0.7" },
      { loc: "#{base_url}/changelog", changefreq: "weekly", priority: "0.5" },
      { loc: "#{base_url}/privacy-policy", changefreq: "monthly", priority: "0.3" },
      { loc: "#{base_url}/terms", changefreq: "monthly", priority: "0.3" },
    ]

    posts.each do |post|
      urls << { loc: "#{base_url}/blog/#{post.slug}", changefreq: "monthly", priority: "0.6" }
    end

    xml = <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        #{urls.map { |u| sitemap_url(u) }.join}
      </urlset>
    XML

    render xml: xml.strip, content_type: "application/xml; charset=utf-8"
  end

  private

  def sitemap_url(url)
    <<~URL
      <url>
        <loc>#{url[:loc]}</loc>
        <changefreq>#{url[:changefreq]}</changefreq>
        <priority>#{url[:priority]}</priority>
      </url>
    URL
  end
end
