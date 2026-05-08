class Role < ApplicationRecord
  has_many :user_roles, dependent: :destroy
  has_many :users, through: :user_roles

  validates :name, presence: true, uniqueness: true

  def parsed_permissions
    JSON.parse(permissions || "[]")
  end

  def parsed_permissions=(perms)
    self.permissions = perms.to_json
  end
end
