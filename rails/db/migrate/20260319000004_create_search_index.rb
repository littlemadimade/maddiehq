class CreateSearchIndex < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
        name,
        description,
        content='items',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
        INSERT INTO items_fts(rowid, name, description) VALUES (NEW.rowid, NEW.name, NEW.description);
      END;

      CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, name, description) VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
      END;

      CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, name, description) VALUES ('delete', OLD.rowid, OLD.name, OLD.description);
        INSERT INTO items_fts(rowid, name, description) VALUES (NEW.rowid, NEW.name, NEW.description);
      END;
    SQL
  end

  def down
    execute <<-SQL
      DROP TRIGGER IF EXISTS items_fts_update;
      DROP TRIGGER IF EXISTS items_fts_delete;
      DROP TRIGGER IF EXISTS items_fts_insert;
      DROP TABLE IF EXISTS items_fts;
    SQL
  end
end
