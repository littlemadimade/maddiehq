class BlogPost < ApplicationRecord
  belongs_to :author, class_name: "User", optional: true

  validates :title, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :content, presence: true
  validates :status, inclusion: { in: %w[draft published archived] }, allow_nil: true

  scope :published, -> { where(status: "published").where.not(published_at: nil) }
  scope :drafts, -> { where(status: "draft") }
  scope :recent, -> { order(published_at: :desc) }

  def tags_list
    return [] if tags.blank?
    JSON.parse(tags) rescue tags.split(",").map(&:strip)
  end

  def tags_list=(array)
    self.tags = array.is_a?(Array) ? array.to_json : array
  end

  def reading_time
    words = content.to_s.split.length
    minutes = (words / 200.0).ceil
    "#{minutes} min read"
  end

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }

  private

  def generate_slug
    self.slug = title.parameterize
  end
end
