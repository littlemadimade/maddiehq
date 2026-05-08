class CreateBlogPosts < ActiveRecord::Migration[7.1]
  def change
    create_table :blog_posts do |t|
      t.string :title, null: false
      t.string :slug, null: false
      t.text :content, null: false
      t.string :status, default: "draft"
      t.string :author_id
      t.datetime :published_at

      t.timestamps
    end

    add_index :blog_posts, :slug, unique: true
    add_index :blog_posts, :author_id
    add_foreign_key :blog_posts, :users, column: :author_id
  end
end
