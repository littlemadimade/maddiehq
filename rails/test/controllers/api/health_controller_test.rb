require "test_helper"

class Api::HealthControllerTest < ActionDispatch::IntegrationTest
  test "GET /api/health returns 200 with ok and db fields" do
    get "/api/health"

    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal true, json["ok"]
    assert_equal true, json["db"]
    assert json.key?("timestamp"), "Response should include timestamp"
  end
end
