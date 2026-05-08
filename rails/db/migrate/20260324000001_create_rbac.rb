class CreateRbac < ActiveRecord::Migration[7.1]
  def change
    create_table :roles, id: :string do |t|
      t.string :name, null: false
      t.text :description
      t.text :permissions, null: false, default: "[]"
      t.boolean :is_system, null: false, default: false
      t.timestamps
    end
    add_index :roles, :name, unique: true

    create_table :user_roles do |t|
      t.references :user, null: false, foreign_key: true, type: :string
      t.references :role, null: false, foreign_key: true, type: :string
      t.string :assigned_by
      t.timestamps
    end
    add_index :user_roles, [:user_id, :role_id], unique: true
    add_foreign_key :user_roles, :users, column: :assigned_by
  end
end
