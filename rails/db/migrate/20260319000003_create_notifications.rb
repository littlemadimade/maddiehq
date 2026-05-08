class CreateNotifications < ActiveRecord::Migration[7.1]
  def change
    create_table :notifications, id: :string do |t|
      t.string :user_id, null: false
      t.string :notification_type, null: false, default: 'info'
      t.string :title, null: false
      t.text :message, default: ''
      t.boolean :read, null: false, default: false
      t.timestamps
    end
    add_index :notifications, :user_id
    add_index :notifications, [:user_id, :read]
    add_foreign_key :notifications, :users, on_delete: :cascade
  end
end
