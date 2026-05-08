class CreateConversations < ActiveRecord::Migration[7.1]
  def change
    create_table :conversations, id: false do |t|
      t.string :id, primary_key: true
      t.string :user_id, null: false
      t.string :title, null: false, default: "New chat"
      t.timestamps
    end

    add_index :conversations, :user_id
    add_foreign_key :conversations, :users, column: :user_id, on_delete: :cascade

    create_table :chat_messages, id: false do |t|
      t.string :id, primary_key: true
      t.string :conversation_id, null: false
      t.string :role, null: false
      t.text :content, null: false, default: ""
      t.text :attachments_meta
      t.datetime :created_at, default: -> { "CURRENT_TIMESTAMP" }
    end

    add_index :chat_messages, :conversation_id
    add_foreign_key :chat_messages, :conversations, column: :conversation_id, on_delete: :cascade
  end
end
