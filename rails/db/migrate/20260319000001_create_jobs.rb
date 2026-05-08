class CreateJobs < ActiveRecord::Migration[7.1]
  def change
    create_table :jobs do |t|
      t.string :job_type, null: false
      t.text :payload, default: '{}'
      t.string :status, null: false, default: 'pending'
      t.integer :attempts, null: false, default: 0
      t.integer :max_attempts, null: false, default: 3
      t.text :last_error
      t.datetime :scheduled_at, null: false, default: -> { 'CURRENT_TIMESTAMP' }
      t.datetime :started_at
      t.datetime :completed_at
      t.timestamps
    end

    add_index :jobs, [:status, :scheduled_at]
    add_index :jobs, :job_type
  end
end
