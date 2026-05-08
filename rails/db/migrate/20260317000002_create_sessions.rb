class CreateSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :sessions, id: :string do |t|
      t.datetime :expires_at, null: false
      t.string :token, null: false
      t.string :ip_address
      t.string :user_agent
      t.string :user_id, null: false

      t.timestamps
    end

    add_index :sessions, :token, unique: true
    add_index :sessions, :user_id
    add_foreign_key :sessions, :users, column: :user_id, on_delete: :cascade
  end
end
