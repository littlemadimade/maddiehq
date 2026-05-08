class TwoFactor < ApplicationRecord
  belongs_to :user

  validates :secret, presence: true
  validates :backup_codes, presence: true
  validates :user_id, uniqueness: true
end
