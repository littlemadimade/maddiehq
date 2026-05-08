class CreateWaitlist < ActiveRecord::Migration[7.1]
  def change
    create_table :waitlists do |t|
      t.string :email, null: false
      t.string :referral_code, null: false
      t.string :referred_by
      t.integer :referral_count, null: false, default: 0
      t.string :status, null: false, default: "waiting"
      t.datetime :invited_at
      t.timestamps
    end
    add_index :waitlists, :email, unique: true
    add_index :waitlists, :referral_code, unique: true
    add_index :waitlists, :status

    create_table :invite_codes do |t|
      t.string :code, null: false
      t.string :email
      t.references :used_by, foreign_key: { to_table: :users }, type: :string
      t.references :created_by, null: false, foreign_key: { to_table: :users }, type: :string
      t.datetime :used_at
      t.datetime :expires_at
      t.timestamps
    end
    add_index :invite_codes, :code, unique: true
    add_index :invite_codes, :email
  end
end
