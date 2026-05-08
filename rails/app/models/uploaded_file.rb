class UploadedFile < ApplicationRecord
  belongs_to :user
  validates :key, presence: true, uniqueness: true
  validates :filename, presence: true
end
