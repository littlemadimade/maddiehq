class User < ApplicationRecord
  has_many :sessions, dependent: :destroy
  has_many :accounts, dependent: :destroy
  has_one :two_factor, dependent: :destroy
  has_many :items, dependent: :destroy
  has_many :admin_logs, foreign_key: :admin_id, dependent: :nullify
  has_one :plan_override, dependent: :destroy
  has_many :uploaded_files, dependent: :destroy
  has_many :notifications, dependent: :destroy
  has_many :webhooks, dependent: :destroy
  has_many :conversations, dependent: :destroy
  has_many :blog_posts, foreign_key: :author_id, dependent: :nullify
  has_many :user_roles, dependent: :destroy
  has_many :roles, through: :user_roles

  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :plan, inclusion: { in: %w[free pro lifetime enterprise] }, allow_nil: true
  validates :subscription_status, inclusion: { in: %w[inactive active past_due canceled] }, allow_nil: true

  scope :admins, -> { where(is_admin: true) }
  scope :active, -> { where(disabled: false) }

  def admin?
    is_admin
  end

  def credential_account
    accounts.find_by(provider_id: "credential")
  end

  def authenticate(password)
    account = credential_account
    return false unless account&.password
    BCrypt::Password.new(account.password) == password
  end

  def active_subscription?
    subscription_status == "active"
  end

  def effective_plan
    plan_override&.plan || plan
  end
end
