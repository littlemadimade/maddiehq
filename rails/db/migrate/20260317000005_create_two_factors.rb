class CreateTwoFactors < ActiveRecord::Migration[7.1]
  def change
    create_table :two_factors, id: :string do |t|
      t.string :secret, null: false
      t.text :backup_codes, null: false
      t.string :user_id, null: false
    end

    add_index :two_factors, :user_id, unique: true
    add_foreign_key :two_factors, :users, column: :user_id, on_delete: :cascade
  end
end
