# AI chat engine using Anthropic Claude.
# Provides streaming chat with SSE.

require "net/http"
require "json"

module ChatEngine
  MODEL = ENV.fetch("CHAT_MODEL", "claude-sonnet-4-20250514")
  MAX_TOKENS = ENV.fetch("CHAT_MAX_TOKENS", "1024").to_i
  CONTEXT_WINDOW = 20

  def self.stream(messages:, user_id:, user_context: "", &block)
    api_key = ENV["ANTHROPIC_API_KEY"]
    raise "ANTHROPIC_API_KEY not configured" unless api_key.present?

    system_prompt = build_system_prompt(user_context)
    context_messages = apply_context_window(messages)

    uri = URI("https://api.anthropic.com/v1/messages")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri.path)
    request["Content-Type"] = "application/json"
    request["x-api-key"] = api_key
    request["anthropic-version"] = "2023-06-01"

    request.body = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: system_prompt,
      stream: true,
      messages: context_messages.map { |m| { role: m[:role], content: m[:content] } }
    }.to_json

    full_text = ""

    http.request(request) do |response|
      unless response.is_a?(Net::HTTPSuccess)
        error_body = response.body
        Rails.logger.error "[chat] Anthropic API error: #{response.code} #{error_body}"
        block.call({ error: "Chat request failed" })
        return
      end

      response.read_body do |chunk|
        chunk.each_line do |line|
          next unless line.start_with?("data: ")
          json_str = line.sub("data: ", "").strip
          next if json_str == "[DONE]"

          begin
            event = JSON.parse(json_str)
            if event["type"] == "content_block_delta" && event.dig("delta", "text")
              text = event["delta"]["text"]
              full_text += text
              block.call({ text: text })
            end
          rescue JSON::ParserError
            # skip malformed events
          end
        end
      end
    end

    block.call({ done: true, full_text: full_text })
  end

  def self.build_system_prompt(user_context = "")
    app_name = ENV.fetch("APP_NAME", "MaddieHQ")
    prompt = <<~PROMPT
      You are #{app_name}'s AI assistant.

      You are helpful, concise, and friendly. You answer questions directly and suggest next steps when appropriate.

      ## Guidelines
      - Be concise. Lead with the answer, then explain if needed.
      - Use markdown for formatting (bold, lists, code blocks, links).
      - If you reference a feature in the app, link to it: [Feature Name](/app/feature)
      - If you don't know something, say so honestly.
      - Never make up data or statistics.
    PROMPT

    prompt += "\n\n## User Context\n#{user_context}" if user_context.present?
    prompt
  end

  def self.apply_context_window(messages)
    return messages if messages.length <= CONTEXT_WINDOW

    older = messages[0..-(CONTEXT_WINDOW + 1)]
    recent = messages[-CONTEXT_WINDOW..]

    summary = older.map { |m|
      role = m[:role] == "user" ? "User" : "Assistant"
      preview = m[:content].to_s[0..200]
      "#{role}: #{preview}#{"..." if m[:content].to_s.length > 200}"
    }.join("\n")

    [{ role: "user", content: "[Conversation context - #{older.length} earlier messages]\n#{summary}" }] + recent
  end
end
