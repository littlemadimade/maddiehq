class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # Generate UUIDs for string primary keys
  before_create :set_uuid, if: -> { self.class.columns_hash["id"]&.type == :string && id.blank? }

  private

  def set_uuid
    self.id = SecureRandom.uuid
  end
end
