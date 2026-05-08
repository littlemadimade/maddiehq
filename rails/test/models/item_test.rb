require "test_helper"

class ItemTest < ActiveSupport::TestCase
  test "valid item with name and user" do
    item = Item.new(name: "Test Item", user: users(:regular))
    assert item.valid?
  end

  test "name is required" do
    item = Item.new(user: users(:regular))
    assert_not item.valid?
    assert_includes item.errors[:name], "can't be blank"
  end

  test "belongs to user" do
    item = items(:first_item)
    assert_equal users(:regular), item.user
  end

  test "generates UUID on create" do
    item = Item.create!(name: "New Item", user: users(:regular))
    assert_not_nil item.id
    assert_match(/\A[0-9a-f-]{36}\z/, item.id)
  end

  test "description defaults to empty string" do
    item = Item.create!(name: "No Desc", user: users(:regular))
    assert_equal "", item.description
  end
end
