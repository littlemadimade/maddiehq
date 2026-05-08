class CreateWebhooks < ActiveRecord::Migration[7.1]
  def change
    create_table :webhooks, id: :string do |t|
      t.string :user_id, null: false
      t.string :url, null: false
      t.string :secret, null: false
      t.text :events, null: false, default: '[]'
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :webhooks, :user_id
    add_foreign_key :webhooks, :users, on_delete: :cascade

    create_table :webhook_deliveries, id: :string do |t|
      t.string :webhook_id, null: false
      t.string :event, null: false
      t.text :payload, null: false, default: '{}'
      t.integer :response_status
      t.text :response_body
      t.boolean :success, null: false, default: false
      t.integer :attempts, null: false, default: 0
      t.text :last_error
      t.datetime :completed_at
      t.timestamps
    end
    add_index :webhook_deliveries, :webhook_id
    add_index :webhook_deliveries, :created_at
    add_foreign_key :webhook_deliveries, :webhooks, on_delete: :cascade
  end
end
