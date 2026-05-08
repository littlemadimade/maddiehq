# RBAC (Role-Based Access Control) utilities.
#
# Usage:
#   Rbac.user_permissions(user_id)          # => ["items:create", "admin:users"]
#   Rbac.has_permission?(user_id, "items:create")  # => true
#   Rbac.require_permission!(user_id, "admin:users")  # raises ForbiddenError

module Rbac
  PERMISSIONS = {
    # Items
    items_create: "items:create",
    items_read: "items:read",
    items_update: "items:update",
    items_delete: "items:delete",

    # Admin
    admin_users: "admin:users",
    admin_roles: "admin:roles",
    admin_settings: "admin:settings",
    admin_waitlist: "admin:waitlist",
    admin_logs: "admin:logs",
    admin_analytics: "admin:analytics",
    admin_crm: "admin:crm",
    admin_database: "admin:database",

    # Wildcard
    all: "*",
  }.freeze

  PERMISSION_GROUPS = [
    {
      label: "Items",
      permissions: [
        { key: "items:create", label: "Create items" },
        { key: "items:read", label: "Read items" },
        { key: "items:update", label: "Update items" },
        { key: "items:delete", label: "Delete items" },
      ],
    },
    {
      label: "Administration",
      permissions: [
        { key: "admin:users", label: "Manage users" },
        { key: "admin:roles", label: "Manage roles" },
        { key: "admin:settings", label: "Manage settings" },
        { key: "admin:waitlist", label: "Manage waitlist" },
        { key: "admin:logs", label: "View audit logs" },
        { key: "admin:analytics", label: "View analytics" },
        { key: "admin:crm", label: "Manage CRM" },
        { key: "admin:database", label: "Database access" },
      ],
    },
  ].freeze

  ALL_PERMISSIONS = PERMISSION_GROUPS.flat_map { |g| g[:permissions].map { |p| p[:key] } }.freeze

  def self.user_permissions(user_id)
    roles = Role.joins(:user_roles).where(user_roles: { user_id: user_id })
    perms = Set.new
    roles.each do |role|
      role.parsed_permissions.each { |p| perms.add(p) }
    end
    perms.to_a
  end

  def self.has_permission?(user_id, permission)
    # Superadmins (is_admin) bypass RBAC — they have all permissions
    user = User.find_by(id: user_id)
    return true if user&.admin?

    perms = user_permissions(user_id)
    perms.include?("*") || perms.include?(permission)
  end

  def self.require_permission!(user_id, permission)
    unless has_permission?(user_id, permission)
      raise Errors::ForbiddenError, "Missing permission: #{permission}"
    end
  end
end
