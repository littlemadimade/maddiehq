Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # API health check endpoint (JSON)
  namespace :api do
    get "health", to: "health#show"

    # ── Unit 1: Auth ──
    namespace :auth do
      post "signup", to: "registrations#create"
      post "login", to: "sessions#create"
      delete "logout", to: "sessions#destroy"
      get "session", to: "sessions#show"
      post "forgot-password", to: "passwords#forgot"
      post "reset-password", to: "passwords#reset"
      post "verify-email", to: "registrations#verify_email"

      post "2fa/enable", to: "two_factor#enable"
      post "2fa/verify", to: "two_factor#verify"
      post "2fa/verify-setup", to: "two_factor#verify_setup"
      post "2fa/disable", to: "two_factor#disable"

      get "oauth/:provider", to: "oauth#redirect", as: :oauth_redirect
      get "oauth/:provider/callback", to: "oauth#callback", as: :oauth_callback
      post "oauth/:provider/callback", to: "oauth#callback"
    end

    # ── Unit 3: CRUD + API ──
    resources :items, only: [:index, :show, :create, :update, :destroy]
    post "subscribe", to: "subscribe#create"

    # ── Files ──
    resources :files, only: [:index, :create], controller: 'files'
    get "files/:key", to: "files#show", as: :file_download, constraints: { key: /[^\/]+/ }
    delete "files/:key", to: "files#destroy", as: :file_delete, constraints: { key: /[^\/]+/ }

    # ── Notifications ──
    resources :notifications, only: [:index]
    post "notifications/:id/read", to: "notifications#mark_read", as: :notification_read
    post "notifications/read-all", to: "notifications#mark_all_read", as: :notifications_read_all

    # ── Search ──
    get "search", to: "search#index"

    # ── Webhooks ──
    resources :webhooks, only: [:index, :show, :create, :update, :destroy] do
      member do
        post :test
        get :deliveries
      end
    end

    # ── Waitlist ──
    post "waitlist/join", to: "waitlist#join"
    get "waitlist/status", to: "waitlist#status"
    post "waitlist/validate-invite", to: "waitlist#validate_invite"
    post "waitlist/redeem-invite", to: "waitlist#redeem_invite"

    # ── AI Chat ──
    post "chat", to: "chat#create"
    resources :conversations, only: [:index, :show, :create, :destroy] do
      member do
        get :messages, to: "conversations#messages"
        post :messages, to: "conversations#create_message"
      end
    end
    post "voice/speak", to: "voice#speak"

    # ── Analytics ──
    post "analytics/track", to: "analytics#track"

    # ── Real-time SSE ──
    get "realtime/:channel", to: "realtime#show"

    # ── Permissions (RBAC) ──
    get "auth/permissions", to: "auth/permissions#show"

    # ── Unit 4: Stripe ──
    namespace :stripe do
      post "create-checkout", to: "checkout#create"
      get "portal", to: "portal#show"
      get "status", to: "status#show"
      post "webhook", to: "webhooks#create"
    end

    # Cron trigger
    post 'cron', to: 'cron#create'

    # ── Unit 5: Admin ──
    namespace :admin do
      get "dashboard", to: "dashboard#show"

      resources :users, only: [:index, :show] do
        member do
          patch :status
          patch :email
          post "reset-pw", to: "users#reset_password"
          post :plan
        end
      end

      get "analytics", to: "analytics#index"
      get "analytics/growth", to: "analytics#growth"
      get "analytics/revenue", to: "analytics#revenue"
      get "analytics/product", to: "analytics#product"

      resources :blog, only: [:index, :show, :create, :update, :destroy] do
        collection do
          post :preview
        end
      end

      get "logs", to: "logs#index"

      get "database/tables", to: "database#tables"
      get "database/:table", to: "database#show"

      resources :subscribers, only: [:index, :destroy]

      resources :roles, only: [:index, :create, :update, :destroy]
      patch "users/:user_id/role", to: "user_roles#update", as: :user_role_assign
      delete "users/:user_id/role/:role_id", to: "user_roles#destroy", as: :user_role_unassign

      get "waitlist", to: "waitlist#index"
      post "waitlist/invite", to: "waitlist#invite"

      resources :jobs, only: [:index, :create] do
        collection do
          post :process, action: :process_jobs
        end
      end
    end

    # ── Unit 6: Settings ──
    namespace :settings do
      get "account", to: "account#show"
      post "avatar", to: "account#update_avatar"
      get "export", to: "export#show"
      post "delete-account", to: "delete_account#create"
    end
  end

  # ── Unit 7: Frontend Views ──
  root "pages#landing"

  get "auth", to: "auth#show"
  get "forgot-password", to: "auth#forgot_password"
  get "reset-password", to: "auth#reset_password"
  get "verify-email", to: "auth#verify_email"

  get "app", to: "app#show"
  get "app/chat", to: "app#chat"
  get "settings", to: "settings#show"

  get "privacy-policy", to: "pages#privacy_policy"
  get "terms", to: "pages#terms"

  # ── Unit 8: Blog + Content ──
  get "blog", to: "blog#index", as: :blog_index
  get "blog/:slug", to: "blog#show", as: :blog_post
  get "changelog", to: "changelog#index"
  get "feed.xml", to: "feed#show", as: :feed, defaults: { format: :xml }
  get "sitemap.xml", to: "sitemap#show", as: :sitemap, defaults: { format: :xml }
  get "robots.txt", to: "robots#show", as: :robots, defaults: { format: :text }
  get "og-image.svg", to: "og_image#show", as: :og_image

  # Admin pages (HTML views)
  scope "admin" do
    get "/", to: "admin_pages#dashboard", as: :admin_root
    get "users", to: "admin_pages#users", as: :admin_users
    get "users/:id", to: "admin_pages#user_detail", as: :admin_user_detail
    get "analytics", to: "admin_pages#analytics", as: :admin_analytics
    get "logs", to: "admin_pages#logs", as: :admin_logs
    get "database", to: "admin_pages#database", as: :admin_database
    get "database/raw", to: "admin_pages#database_raw", as: :admin_database_raw
    get "crm", to: "admin_pages#crm", as: :admin_crm
    get "crm/blog", to: "admin_pages#blog_editor", as: :admin_blog_editor
    get "roles", to: "admin_pages#roles", as: :admin_roles
    get "waitlist", to: "admin_pages#waitlist", as: :admin_waitlist
  end
end
