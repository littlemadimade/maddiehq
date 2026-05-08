require "test_helper"

class Api::SearchControllerTest < ActionDispatch::IntegrationTest
  test "GET /api/search without auth returns 401" do
    get "/api/search", params: { q: "test" }
    assert_response :unauthorized
  end

  test "GET /api/search without q returns 400" do
    session = sessions(:regular_session)

    get "/api/search", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :bad_request
  end

  test "GET /api/search with q returns results" do
    session = sessions(:regular_session)

    get "/api/search", params: { q: "First" }, headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok
    json = JSON.parse(response.body)
    assert json.key?("results")
    assert json.key?("query")
    assert_equal "First", json["query"]
  end
end
