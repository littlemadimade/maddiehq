class CreateAccounts < ActiveRecord::Migration[7.1]
  def change
    create_table :accounts, id: :string do |t|
      t.string :account_id, null: false
      t.string :provider_id, null: false
      t.string :user_id, null: false
      t.text :access_token
      t.text :refresh_token
      t.text :id_token
      t.datetime :expires_at
      t.string :password
      t.datetime :access_token_expires_at
      t.datetime :refresh_token_expires_at
      t.string :scope

      t.timestamps
    end

    add_index :accounts, [:provider_id, :account_id], unique: true
    add_index :accounts, :user_id
    add_foreign_key :accounts, :users, column: :user_id, on_delete: :cascade
  end
end
