class FeedController < ApplicationController
  # GET /feed.xml
  def show
    @posts = BlogPost.published.recent
    @site_url = ENV.fetch("APP_URL", "https://maddiehq.example.com")
    app_name = ENV.fetch("APP_NAME", "MaddieHQ")

    rss = <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
        <channel>
          <title>#{ERB::Util.html_escape(app_name)} Blog</title>
          <link>#{@site_url}/blog</link>
          <description>Guides, tutorials, and updates from the #{ERB::Util.html_escape(app_name)} team.</description>
          <language>en-us</language>
          <lastBuildDate>#{Time.now.utc.rfc2822}</lastBuildDate>
          <atom:link href="#{@site_url}/feed.xml" rel="self" type="application/rss+xml" />
          #{@posts.map { |post| rss_item(post) }.join}
        </channel>
      </rss>
    XML

    render xml: rss.strip, content_type: "application/xml; charset=utf-8"
  end

  private

  def rss_item(post)
    <<~ITEM
      <item>
        <title><![CDATA[#{post.title}]]></title>
        <link>#{@site_url}/blog/#{post.slug}</link>
        <guid isPermaLink="true">#{@site_url}/blog/#{post.slug}</guid>
        <description><![CDATA[#{post.content.to_s.truncate(200)}]]></description>
        <pubDate>#{post.published_at&.utc&.rfc2822}</pubDate>
        #{post.tags_list.map { |tag| "<category>#{ERB::Util.html_escape(tag)}</category>" }.join("\n        ")}
      </item>
    ITEM
  end
end
