class CreateItems < ActiveRecord::Migration[7.1]
  def change
    create_table :items, id: :string do |t|
      t.string :user_id, null: false
      t.string :name, null: false
      t.text :description, default: ""

      t.timestamps
    end

    add_index :items, :user_id
    add_foreign_key :items, :users, column: :user_id, on_delete: :cascade
  end
end
