module Api
  module Admin
    class AnalyticsController < BaseController
      before_action -> { require_permission!("admin:analytics") }

      PRO_PRICE = 9.99

      # GET /api/admin/analytics
      def index
        total_users = User.count

        # Active users: users who have items created in the last 30 days
        active_users = Item.where("created_at >= ?", 30.days.ago)
                           .distinct.count(:user_id)

        # Plan breakdown using effective plan (considering overrides)
        plan_rows = User.left_joins(:plan_override)
                        .select(
                          "CASE WHEN plan_overrides.plan IS NOT NULL " \
                          "AND (plan_overrides.expires_at IS NULL OR plan_overrides.expires_at > ?) " \
                          "THEN plan_overrides.plan ELSE COALESCE(users.plan, 'free') END AS effective_plan, " \
                          "COUNT(*) AS cnt",
                          Time.current
                        )
                        .group("effective_plan")

        plan_breakdown = { "free" => 0, "pro" => 0 }
        plan_rows.each do |row|
          if row.effective_plan == "pro"
            plan_breakdown["pro"] += row.cnt
          else
            plan_breakdown["free"] += row.cnt
          end
        end

        total_items = Item.count

        # Recent activity: last 20 entries combining signups and admin logs
        recent_signups = User.where("created_at >= ?", 7.days.ago)
                             .order(created_at: :desc)
                             .limit(20).map do |u|
          {
            type: "signup",
            description: "New user signed up: #{u.email}",
            timestamp: u.created_at.iso8601
          }
        end

        recent_admin_actions = AdminLog.includes(:admin)
                                       .order(created_at: :desc)
                                       .limit(20).map do |log|
          desc = "#{log.admin&.email || 'Admin'} performed #{log.action}"
          desc += " on #{log.target_type}" if log.target_type.present?
          desc += " ##{log.target_id}" if log.target_id.present?
          {
            type: "admin_action",
            description: desc,
            timestamp: log.created_at.iso8601
          }
        end

        recent_activity = (recent_signups + recent_admin_actions)
                            .sort_by { |a| a[:timestamp] }
                            .reverse
                            .first(20)

        render json: {
          data: {
            total_users: total_users,
            active_users: active_users,
            plan_breakdown: plan_breakdown,
            total_items: total_items,
            recent_activity: recent_activity
          }
        }
      end

      # GET /api/admin/analytics/growth
      def growth
        # Signups by day - last 30 days
        signups_by_day = User.where("created_at >= ?", 30.days.ago)
                             .group("date(created_at)")
                             .order("date(created_at) ASC")
                             .count
                             .map { |day, count| { day: day, count: count } }

        # DAU
        dau = Item.where("date(created_at) = date('now')")
                  .distinct.count(:user_id)

        # WAU
        wau = Item.where("created_at >= ?", 7.days.ago)
                  .distinct.count(:user_id)

        # MAU
        mau = Item.where("created_at >= ?", 30.days.ago)
                  .distinct.count(:user_id)

        total_users = User.count

        # Pro users
        pro_users = User.left_joins(:plan_override)
                        .where(
                          "(plan_overrides.plan = 'pro' AND (plan_overrides.expires_at IS NULL OR plan_overrides.expires_at > ?)) " \
                          "OR (plan_overrides.plan IS NULL AND users.plan = 'pro')",
                          Time.current
                        )
                        .distinct.count

        conversion_rate = total_users > 0 ? pro_users.to_f / total_users : 0

        render json: {
          data: {
            signups_by_day: signups_by_day,
            dau: dau,
            wau: wau,
            mau: mau,
            conversion_rate: conversion_rate,
            total_users: total_users,
            pro_users: pro_users
          }
        }
      end

      # GET /api/admin/analytics/revenue
      def revenue
        plan_counts = User.left_joins(:plan_override)
                          .select(
                            "CASE WHEN plan_overrides.plan IS NOT NULL " \
                            "AND (plan_overrides.expires_at IS NULL OR plan_overrides.expires_at > ?) " \
                            "THEN plan_overrides.plan ELSE COALESCE(users.plan, 'free') END AS effective_plan, " \
                            "COUNT(*) AS cnt",
                            Time.current
                          )
                          .group("effective_plan")

        pro_count = 0
        free_count = 0
        plan_counts.each do |row|
          if row.effective_plan == "pro"
            pro_count += row.cnt
          else
            free_count += row.cnt
          end
        end

        mrr = pro_count * PRO_PRICE

        # Recent upgrades from overrides in last 30 days
        recent_upgrades = PlanOverride.joins(:user)
                                      .where(plan: "pro")
                                      .where("plan_overrides.created_at >= ?", 30.days.ago)
                                      .order("plan_overrides.created_at DESC")
                                      .map do |po|
          {
            id: po.user_id,
            email: po.user.email,
            upgraded_at: po.created_at.iso8601,
            source: "override"
          }
        end

        render json: {
          data: {
            mrr: mrr,
            pro_price: PRO_PRICE,
            plan_breakdown: {
              free: free_count,
              pro: pro_count
            },
            recent_upgrades: recent_upgrades
          }
        }
      end

      # GET /api/admin/analytics/product
      def product
        users_with_items = Item.distinct.count(:user_id)
        total_items = Item.count
        total_users = User.count

        avg_items_per_user = users_with_items > 0 ? total_items.to_f / users_with_items : 0

        # Items created by day - last 30 days
        items_by_day = Item.where("created_at >= ?", 30.days.ago)
                           .group("date(created_at)")
                           .order("date(created_at) ASC")
                           .count
                           .map { |day, count| { day: day, count: count } }

        # Top 10 item names by frequency
        top_item_names = Item.group(:name)
                             .order("count_all DESC")
                             .limit(10)
                             .count
                             .map { |name, count| { name: name, count: count } }

        # Items per user distribution
        item_count_distribution = ActiveRecord::Base.connection.execute(<<~SQL).to_a
          SELECT
            CASE
              WHEN item_count = 1 THEN '1'
              WHEN item_count BETWEEN 2 AND 5 THEN '2-5'
              WHEN item_count BETWEEN 6 AND 10 THEN '6-10'
              ELSE '10+'
            END AS bucket,
            COUNT(*) AS users
          FROM (
            SELECT user_id, COUNT(*) AS item_count
            FROM items
            GROUP BY user_id
          )
          GROUP BY bucket
          ORDER BY MIN(item_count) ASC
        SQL

        render json: {
          data: {
            avg_items_per_user: avg_items_per_user,
            users_with_items: users_with_items,
            total_items: total_items,
            total_users: total_users,
            items_by_day: items_by_day,
            top_item_names: top_item_names,
            item_count_distribution: item_count_distribution
          }
        }
      end
    end
  end
end
