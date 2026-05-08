# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_03_30_000001) do
  create_table "accounts", id: :string, force: :cascade do |t|
    t.string "account_id", null: false
    t.string "provider_id", null: false
    t.string "user_id", null: false
    t.text "access_token"
    t.text "refresh_token"
    t.text "id_token"
    t.datetime "expires_at"
    t.string "password"
    t.datetime "access_token_expires_at"
    t.datetime "refresh_token_expires_at"
    t.string "scope"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["provider_id", "account_id"], name: "index_accounts_on_provider_id_and_account_id", unique: true
    t.index ["user_id"], name: "index_accounts_on_user_id"
  end

  create_table "admin_logs", force: :cascade do |t|
    t.string "admin_id", null: false
    t.string "action", null: false
    t.string "target_type"
    t.string "target_id"
    t.text "details"
    t.datetime "created_at", null: false
    t.index ["admin_id"], name: "index_admin_logs_on_admin_id"
  end

  create_table "blog_posts", force: :cascade do |t|
    t.string "title", null: false
    t.string "slug", null: false
    t.text "content", null: false
    t.string "status", default: "draft"
    t.string "author_id"
    t.datetime "published_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "tags"
    t.index ["author_id"], name: "index_blog_posts_on_author_id"
    t.index ["slug"], name: "index_blog_posts_on_slug", unique: true
  end

  create_table "chat_messages", id: :string, force: :cascade do |t|
    t.string "conversation_id", null: false
    t.string "role", null: false
    t.text "content", default: "", null: false
    t.text "attachments_meta"
    t.datetime "created_at", default: -> { "CURRENT_TIMESTAMP" }
    t.index ["conversation_id"], name: "index_chat_messages_on_conversation_id"
  end

  create_table "conversations", id: :string, force: :cascade do |t|
    t.string "user_id", null: false
    t.string "title", default: "New chat", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_conversations_on_user_id"
  end

  create_table "invite_codes", force: :cascade do |t|
    t.string "code", null: false
    t.string "email"
    t.string "used_by_id"
    t.string "created_by_id", null: false
    t.datetime "used_at"
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_invite_codes_on_code", unique: true
    t.index ["created_by_id"], name: "index_invite_codes_on_created_by_id"
    t.index ["email"], name: "index_invite_codes_on_email"
    t.index ["used_by_id"], name: "index_invite_codes_on_used_by_id"
  end

  create_table "items", id: :string, force: :cascade do |t|
    t.string "user_id", null: false
    t.string "name", null: false
    t.text "description", default: ""
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_items_on_user_id"
  end

  create_table "items_fts_data", force: :cascade do |t|
    t.binary "block"
  end

  create_table "items_fts_docsize", force: :cascade do |t|
    t.binary "sz"
  end

  create_table "jobs", force: :cascade do |t|
    t.string "job_type", null: false
    t.text "payload", default: "{}"
    t.string "status", default: "pending", null: false
    t.integer "attempts", default: 0, null: false
    t.integer "max_attempts", default: 3, null: false
    t.text "last_error"
    t.datetime "scheduled_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["job_type"], name: "index_jobs_on_job_type"
    t.index ["status", "scheduled_at"], name: "index_jobs_on_status_and_scheduled_at"
  end

  create_table "newsletter_subscribers", force: :cascade do |t|
    t.string "email", null: false
    t.string "status", default: "active"
    t.datetime "created_at", null: false
    t.index ["email"], name: "index_newsletter_subscribers_on_email", unique: true
  end

  create_table "notifications", id: :string, force: :cascade do |t|
    t.string "user_id", null: false
    t.string "notification_type", default: "info", null: false
    t.string "title", null: false
    t.text "message", default: ""
    t.boolean "read", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "read"], name: "index_notifications_on_user_id_and_read"
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "plan_overrides", force: :cascade do |t|
    t.string "user_id", null: false
    t.string "plan", default: "pro", null: false
    t.text "reason"
    t.string "granted_by", null: false
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.index ["user_id"], name: "index_plan_overrides_on_user_id", unique: true
  end

  create_table "roles", id: :string, force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.text "permissions", default: "[]", null: false
    t.boolean "is_system", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_roles_on_name", unique: true
  end

  create_table "sessions", id: :string, force: :cascade do |t|
    t.datetime "expires_at", null: false
    t.string "token", null: false
    t.string "ip_address"
    t.string "user_agent"
    t.string "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["token"], name: "index_sessions_on_token", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "two_factors", id: :string, force: :cascade do |t|
    t.string "secret", null: false
    t.text "backup_codes", null: false
    t.string "user_id", null: false
    t.index ["user_id"], name: "index_two_factors_on_user_id", unique: true
  end

  create_table "uploaded_files", id: :string, force: :cascade do |t|
    t.string "user_id", null: false
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type", default: "application/octet-stream", null: false
    t.integer "size", default: 0, null: false
    t.string "storage_backend", default: "local", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_uploaded_files_on_key", unique: true
    t.index ["user_id"], name: "index_uploaded_files_on_user_id"
  end

  create_table "user_roles", force: :cascade do |t|
    t.string "user_id", null: false
    t.string "role_id", null: false
    t.string "assigned_by"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["role_id"], name: "index_user_roles_on_role_id"
    t.index ["user_id", "role_id"], name: "index_user_roles_on_user_id_and_role_id", unique: true
    t.index ["user_id"], name: "index_user_roles_on_user_id"
  end

  create_table "users", id: :string, force: :cascade do |t|
    t.string "email", null: false
    t.boolean "email_verified", default: false
    t.string "name"
    t.string "image"
    t.boolean "two_factor_enabled", default: false
    t.string "plan", default: "free"
    t.string "stripe_customer_id"
    t.string "stripe_subscription_id"
    t.string "subscription_status", default: "inactive"
    t.boolean "is_admin", default: false
    t.boolean "disabled", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["stripe_customer_id"], name: "index_users_on_stripe_customer_id", unique: true
  end

  create_table "verifications", id: :string, force: :cascade do |t|
    t.string "identifier", null: false
    t.string "value", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["identifier"], name: "index_verifications_on_identifier"
  end

  create_table "waitlists", force: :cascade do |t|
    t.string "email", null: false
    t.string "referral_code", null: false
    t.string "referred_by"
    t.integer "referral_count", default: 0, null: false
    t.string "status", default: "waiting", null: false
    t.datetime "invited_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_waitlists_on_email", unique: true
    t.index ["referral_code"], name: "index_waitlists_on_referral_code", unique: true
    t.index ["status"], name: "index_waitlists_on_status"
  end

  create_table "webhook_deliveries", id: :string, force: :cascade do |t|
    t.string "webhook_id", null: false
    t.string "event", null: false
    t.text "payload", default: "{}", null: false
    t.integer "response_status"
    t.text "response_body"
    t.boolean "success", default: false, null: false
    t.integer "attempts", default: 0, null: false
    t.text "last_error"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_webhook_deliveries_on_created_at"
    t.index ["webhook_id"], name: "index_webhook_deliveries_on_webhook_id"
  end

  create_table "webhooks", id: :string, force: :cascade do |t|
    t.string "user_id", null: false
    t.string "url", null: false
    t.string "secret", null: false
    t.text "events", default: "[]", null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_webhooks_on_user_id"
  end

  add_foreign_key "accounts", "users", on_delete: :cascade
  add_foreign_key "admin_logs", "users", column: "admin_id"
  add_foreign_key "blog_posts", "users", column: "author_id"
  add_foreign_key "chat_messages", "conversations", on_delete: :cascade
  add_foreign_key "conversations", "users", on_delete: :cascade
  add_foreign_key "invite_codes", "users", column: "created_by_id"
  add_foreign_key "invite_codes", "users", column: "used_by_id"
  add_foreign_key "items", "users", on_delete: :cascade
  add_foreign_key "notifications", "users", on_delete: :cascade
  add_foreign_key "plan_overrides", "users", column: "granted_by"
  add_foreign_key "plan_overrides", "users", on_delete: :cascade
  add_foreign_key "sessions", "users", on_delete: :cascade
  add_foreign_key "two_factors", "users", on_delete: :cascade
  add_foreign_key "uploaded_files", "users", on_delete: :cascade
  add_foreign_key "user_roles", "roles"
  add_foreign_key "user_roles", "users"
  add_foreign_key "user_roles", "users", column: "assigned_by"
  add_foreign_key "webhook_deliveries", "webhooks", on_delete: :cascade
  add_foreign_key "webhooks", "users", on_delete: :cascade
end
