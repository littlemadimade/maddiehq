class CreateAdminLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :admin_logs do |t|
      t.string :admin_id, null: false
      t.string :action, null: false
      t.string :target_type
      t.string :target_id
      t.text :details

      t.datetime :created_at, null: false
    end

    add_index :admin_logs, :admin_id
    add_foreign_key :admin_logs, :users, column: :admin_id
  end
end
