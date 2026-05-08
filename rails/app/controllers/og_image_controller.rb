class OgImageController < ApplicationController
  skip_before_action :verify_authenticity_token

  def show
    name = helpers.app_name
    tagline = "Ship your next idea faster"

    svg = <<~SVG
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#059669"/>
            <stop offset="100%" style="stop-color:#10b981"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <text x="600" y="280" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="72" font-weight="bold" fill="white">#{ERB::Util.html_escape(name)}</text>
        <text x="600" y="360" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="32" fill="rgba(255,255,255,0.85)">#{ERB::Util.html_escape(tagline)}</text>
      </svg>
    SVG

    response.headers["Cache-Control"] = "public, max-age=86400"
    render body: svg, content_type: "image/svg+xml"
  end
end
