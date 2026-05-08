require "test_helper"

class Api::WebhooksControllerTest < ActionDispatch::IntegrationTest
  test "GET /api/webhooks without auth returns 401" do
    get "/api/webhooks"
    assert_response :unauthorized
  end

  test "GET /api/webhooks returns webhooks for current user" do
    session = sessions(:regular_session)

    get "/api/webhooks", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok
    json = JSON.parse(response.body)
    webhooks = json["webhooks"]
    assert_equal 1, webhooks.length
    # Secret should not be in response
    assert_nil webhooks[0]["secret"]
  end

  test "POST /api/webhooks creates a webhook" do
    session = sessions(:regular_session)

    assert_difference("Webhook.count", 1) do
      post "/api/webhooks", params: {
        url: "https://example.com/hook",
        events: ["item.created"]
      }, headers: {
        "Authorization" => "Bearer #{session.token}"
      }, as: :json
    end

    assert_response :created
  end

  test "POST /api/webhooks with invalid URL returns 400" do
    session = sessions(:regular_session)

    post "/api/webhooks", params: {
      url: "not-a-url",
      events: []
    }, headers: {
      "Authorization" => "Bearer #{session.token}"
    }, as: :json

    assert_response :bad_request
  end

  test "DELETE /api/webhooks/:id deletes webhook" do
    session = sessions(:regular_session)
    webhook = webhooks(:regular_webhook)

    assert_difference("Webhook.count", -1) do
      delete "/api/webhooks/#{webhook.id}", headers: {
        "Authorization" => "Bearer #{session.token}"
      }
    end

    assert_response :ok
  end
end
