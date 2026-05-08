class RobotsController < ApplicationController
  # GET /robots.txt
  def show
    base_url = ENV.fetch("APP_URL", "https://maddiehq.example.com")

    content = <<~ROBOTS
      User-agent: *
      Allow: /
      Disallow: /app/
      Disallow: /settings/
      Disallow: /api/
      Disallow: /verify-email/
      Disallow: /admin/

      Sitemap: #{base_url}/sitemap.xml
    ROBOTS

    render plain: content, content_type: "text/plain"
  end
end
