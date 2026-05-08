require "test_helper"

class Api::FilesControllerTest < ActionDispatch::IntegrationTest
  test "GET /api/files without auth returns 401" do
    get "/api/files"
    assert_response :unauthorized
  end

  test "GET /api/files returns files for current user" do
    session = sessions(:regular_session)

    get "/api/files", headers: {
      "Authorization" => "Bearer #{session.token}"
    }

    assert_response :ok
    json = JSON.parse(response.body)
    assert json.key?("files")
  end

  test "POST /api/files uploads a file" do
    session = sessions(:regular_session)
    file = fixture_file_upload("test.txt", "text/plain")

    assert_difference("UploadedFile.count", 1) do
      post "/api/files", params: { file: file }, headers: {
        "Authorization" => "Bearer #{session.token}"
      }
    end

    assert_response :created
    json = JSON.parse(response.body)
    assert json.key?("file")
    assert json.key?("url")
  end
end
