class CreatePlanOverrides < ActiveRecord::Migration[7.1]
  def change
    create_table :plan_overrides do |t|
      t.string :user_id, null: false
      t.string :plan, default: "pro", null: false
      t.text :reason
      t.string :granted_by, null: false
      t.datetime :expires_at

      t.datetime :created_at, null: false
    end

    add_index :plan_overrides, :user_id, unique: true
    add_foreign_key :plan_overrides, :users, column: :user_id, on_delete: :cascade
    add_foreign_key :plan_overrides, :users, column: :granted_by
  end
end
