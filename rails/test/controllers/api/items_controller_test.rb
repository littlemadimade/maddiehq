require "test_helper"

class Api::ItemsControllerTest < ActionDispatch::IntegrationTest
  # ── Authentication Required ──

  test "GET /api/items without auth returns 401" do
    get "/api/items"
    assert_response :unauthorized
  end

  test "POST /api/items without auth returns 401" do
    post "/api/items", params: { name: "Test" }, as: :json
    assert_response :unauthorized
  end

  # ── GET /api/items (index) ──

  test "GET /api/items returns only current user items" do
    session = sessions(:regular_session)

    get "/api/items", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok

    json = JSON.parse(response.body)
    items = json["items"]

    # Regular user has 2 items in fixtures
    assert_equal 2, items.length

    # Should not include admin's item
    item_ids = items.map { |i| i["id"] }
    assert_not_includes item_ids, items(:admin_item).id
  end

  # ── GET /api/items/:id (show) ──

  test "GET /api/items/:id returns the item" do
    session = sessions(:regular_session)
    item = items(:first_item)

    get "/api/items/#{item.id}", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal item.id, json["item"]["id"]
    assert_equal item.name, json["item"]["name"]
  end

  test "GET /api/items/:id for another user item returns 404" do
    session = sessions(:regular_session)
    admin_item = items(:admin_item)

    get "/api/items/#{admin_item.id}", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :not_found
  end

  # ── POST /api/items (create) ──

  test "POST /api/items creates a new item" do
    session = sessions(:regular_session)

    assert_difference("Item.count", 1) do
      post "/api/items", params: {
        name: "New Item",
        description: "A new item"
      }, headers: {
        "Authorization" => "Bearer #{session.token}"
      }, as: :json
    end

    assert_response :created

    json = JSON.parse(response.body)
    assert_equal "New Item", json["item"]["name"]
    assert_equal "A new item", json["item"]["description"]
  end

  test "POST /api/items with blank name returns 400" do
    session = sessions(:regular_session)

    post "/api/items", params: {
      name: "",
      description: "No name"
    }, headers: {
      "Authorization" => "Bearer #{session.token}"
    }, as: :json

    assert_response :bad_request
  end

  test "POST /api/items with missing name returns 400" do
    session = sessions(:regular_session)

    post "/api/items", params: {
      description: "No name at all"
    }, headers: {
      "Authorization" => "Bearer #{session.token}"
    }, as: :json

    assert_response :bad_request
  end

  # ── PATCH /api/items/:id (update) ──

  test "PATCH /api/items/:id updates the item" do
    session = sessions(:regular_session)
    item = items(:first_item)

    patch "/api/items/#{item.id}", params: {
      name: "Updated Name",
      description: "Updated description"
    }, headers: {
      "Authorization" => "Bearer #{session.token}"
    }, as: :json

    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal "Updated Name", json["item"]["name"]
    assert_equal "Updated description", json["item"]["description"]

    item.reload
    assert_equal "Updated Name", item.name
  end

  test "PATCH /api/items/:id with blank name returns 400" do
    session = sessions(:regular_session)
    item = items(:first_item)

    patch "/api/items/#{item.id}", params: {
      name: ""
    }, headers: {
      "Authorization" => "Bearer #{session.token}"
    }, as: :json

    assert_response :bad_request
  end

  test "PATCH /api/items/:id for another user item returns 404" do
    session = sessions(:regular_session)
    admin_item = items(:admin_item)

    patch "/api/items/#{admin_item.id}", params: {
      name: "Hacked"
    }, headers: {
      "Authorization" => "Bearer #{session.token}"
    }, as: :json

    assert_response :not_found
  end

  # ── DELETE /api/items/:id (destroy) ──

  test "DELETE /api/items/:id destroys the item" do
    session = sessions(:regular_session)
    item = items(:first_item)

    assert_difference("Item.count", -1) do
      delete "/api/items/#{item.id}", headers: {
        "Authorization" => "Bearer #{session.token}"
      }
    end

    assert_response :ok

    json = JSON.parse(response.body)
    assert_equal true, json["ok"]
  end

  test "DELETE /api/items/:id for another user item returns 404" do
    session = sessions(:regular_session)
    admin_item = items(:admin_item)

    assert_no_difference("Item.count") do
      delete "/api/items/#{admin_item.id}", headers: {
        "Authorization" => "Bearer #{session.token}"
      }
    end

    assert_response :not_found
  end
end
