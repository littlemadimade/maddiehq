module Api
  module Admin
    class DatabaseController < BaseController
      before_action -> { require_permission!("admin:database") }

      # GET /api/admin/database/tables
      def tables
        table_names = valid_table_names

        data = table_names.map do |name|
          count = ActiveRecord::Base.connection.select_value("SELECT COUNT(*) FROM \"#{name}\"")
          { name: name, row_count: count.to_i }
        end

        render json: { data: data }
      end

      # GET /api/admin/database/:table
      def show
        table = params[:table]

        unless valid_table_names.include?(table)
          return render json: { error: "Invalid table name" }, status: :bad_request
        end

        page = [(params[:page] || 0).to_i, 0].max
        limit = [[1, (params[:limit] || 50).to_i].max, 200].min
        offset = page * limit

        sort = params[:sort]
        order = params[:order] == "desc" ? "DESC" : "ASC"

        columns = column_info(table)
        valid_columns = columns.map { |c| c["name"] }.to_set

        sort_clause = if sort.present? && valid_columns.include?(sort)
          "ORDER BY \"#{sort}\" #{order}"
        else
          ""
        end

        # Build WHERE clause from filter param
        where_clause = ""
        bind_values = []
        if params[:filter].present?
          begin
            filters = JSON.parse(params[:filter])
            conditions = []
            filters.each do |col, val|
              if valid_columns.include?(col) && val.present?
                conditions << "\"#{col}\" LIKE ?"
                bind_values << "%#{val}%"
              end
            end
            where_clause = "WHERE #{conditions.join(' AND ')}" if conditions.any?
          rescue JSON::ParserError
            # Ignore malformed filter
          end
        end

        conn = ActiveRecord::Base.connection

        total_sql = "SELECT COUNT(*) FROM \"#{table}\" #{where_clause}"
        total = if bind_values.any?
          conn.select_value(ActiveRecord::Base.sanitize_sql_array([total_sql] + bind_values)).to_i
        else
          conn.select_value(total_sql).to_i
        end

        rows_sql = "SELECT * FROM \"#{table}\" #{where_clause} #{sort_clause} LIMIT #{limit} OFFSET #{offset}"
        rows = if bind_values.any?
          conn.select_all(ActiveRecord::Base.sanitize_sql_array([rows_sql] + bind_values)).to_a
        else
          conn.select_all(rows_sql).to_a
        end

        render json: {
          data: {
            rows: redact_rows(rows),
            total: total,
            page: page,
            limit: limit,
            columns: columns
          }
        }
      end

      private

      # Tables that contain sensitive auth data — hidden from browser
      RESTRICTED_TABLES = %w[sessions two_factors verifications].freeze

      # Columns redacted from results (shown as "***")
      REDACTED_COLUMNS = %w[password secret backup_codes token value access_token refresh_token id_token].freeze

      def valid_table_names
        ActiveRecord::Base.connection.tables
          .reject { |t| t.start_with?("sqlite_") || RESTRICTED_TABLES.include?(t) }
          .sort
      end

      def redact_rows(rows)
        rows.map do |row|
          row.transform_keys(&:to_s).each_with_object({}) do |(k, v), h|
            h[k] = REDACTED_COLUMNS.include?(k) && v.present? ? "***" : v
          end
        end
      end

      def column_info(table)
        ActiveRecord::Base.connection.execute("PRAGMA table_info(\"#{table}\")").to_a
      end
    end
  end
end
