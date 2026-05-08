module SearchService
  def self.search_items(user_id, query, limit: 20)
    return [] if query.blank?

    sanitized = query.gsub(/['"*()]/, '').strip
    return [] if sanitized.blank?

    fts_query = sanitized.split(/\s+/).map { |term| "\"#{term}\"*" }.join(' ')

    begin
      sql = <<-SQL
        SELECT
          items.id,
          items.name,
          items.description,
          snippet(items_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          rank
        FROM items_fts
        JOIN items ON items.rowid = items_fts.rowid
        WHERE items_fts MATCH ?
          AND items.user_id = ?
        ORDER BY rank
        LIMIT ?
      SQL

      ActiveRecord::Base.connection.select_all(
        ActiveRecord::Base.sanitize_sql([sql, fts_query, user_id, limit])
      ).to_a
    rescue => e
      Rails.logger.warn("[SearchService] FTS query failed: #{e.message}, falling back to LIKE")
      like_query = "%#{sanitized}%"
      Item.where(user_id: user_id)
          .where('name LIKE ? OR description LIKE ?', like_query, like_query)
          .limit(limit)
          .map { |i| { 'id' => i.id, 'name' => i.name, 'description' => i.description, 'snippet' => i.name } }
    end
  end

  def self.rebuild_index
    ActiveRecord::Base.connection.execute("INSERT INTO items_fts(items_fts) VALUES('rebuild')")
  end
end
