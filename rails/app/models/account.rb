class Account < ApplicationRecord
  belongs_to :user

  validates :account_id, presence: true
  validates :provider_id, presence: true
  validates :provider_id, uniqueness: { scope: :account_id }

  scope :for_provider, ->(provider) { where(provider_id: provider) }
end
