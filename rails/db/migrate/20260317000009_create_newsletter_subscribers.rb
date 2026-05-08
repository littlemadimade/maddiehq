class CreateNewsletterSubscribers < ActiveRecord::Migration[7.1]
  def change
    create_table :newsletter_subscribers do |t|
      t.string :email, null: false
      t.string :status, default: "active"

      t.datetime :created_at, null: false
    end

    add_index :newsletter_subscribers, :email, unique: true
  end
end
