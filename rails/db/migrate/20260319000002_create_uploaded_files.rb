class CreateUploadedFiles < ActiveRecord::Migration[7.1]
  def change
    create_table :uploaded_files, id: :string do |t|
      t.string :user_id, null: false
      t.string :key, null: false
      t.string :filename, null: false
      t.string :content_type, null: false, default: 'application/octet-stream'
      t.integer :size, null: false, default: 0
      t.string :storage_backend, null: false, default: 'local'
      t.timestamps
    end
    add_index :uploaded_files, :user_id
    add_index :uploaded_files, :key, unique: true
    add_foreign_key :uploaded_files, :users, on_delete: :cascade
  end
end
