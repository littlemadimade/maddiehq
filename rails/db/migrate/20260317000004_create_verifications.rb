class CreateVerifications < ActiveRecord::Migration[7.1]
  def change
    create_table :verifications, id: :string do |t|
      t.string :identifier, null: false
      t.string :value, null: false
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :verifications, :identifier
  end
end
