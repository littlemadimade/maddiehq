class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users, id: :string do |t|
      t.string :email, null: false
      t.boolean :email_verified, default: false
      t.string :name
      t.string :image
      t.boolean :two_factor_enabled, default: false
      t.string :plan, default: "free"
      t.string :stripe_customer_id
      t.string :stripe_subscription_id
      t.string :subscription_status, default: "inactive"
      t.boolean :is_admin, default: false
      t.boolean :disabled, default: false

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :stripe_customer_id, unique: true
  end
end
