# Production multi-stage Dockerfile for Rails
# Build with: DOCKER_BUILDKIT=0 docker build -t appseed-rails .

ARG RUBY_VERSION=3.3
FROM ruby:${RUBY_VERSION}-alpine AS builder

RUN apk add --no-cache \
    build-base \
    git \
    sqlite-dev \
    yaml-dev \
    tzdata

WORKDIR /app

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment true && \
    bundle config set --local without 'development test' && \
    bundle config set --local force_ruby_platform true && \
    bundle install && \
    rm -rf ~/.bundle/ vendor/bundle/ruby/*/cache vendor/bundle/ruby/*/bundler/gems/*/.git

# Copy application code
COPY . .

# Precompile assets (dummy secret so Rails boots without real credentials)
RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM ruby:${RUBY_VERSION}-alpine

RUN apk add --no-cache \
    sqlite-libs \
    yaml \
    tzdata \
    curl

WORKDIR /app

# Copy gems and app from builder
COPY --from=builder /usr/local/bundle /usr/local/bundle
COPY --from=builder /app /app

# Create non-root user
RUN adduser -D -h /home/rails rails && \
    mkdir -p /data && \
    chown -R rails:rails /app /data

VOLUME /data

ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT=development:test \
    DATABASE_PATH=/data/appseed-rails.db \
    RAILS_LOG_TO_STDOUT=1 \
    RAILS_SERVE_STATIC_FILES=1

USER rails:rails

EXPOSE 3014

# Run migrations then start the server
CMD ["sh", "-c", "bin/rails db:migrate && bin/rails server -b 0.0.0.0 -p 3014"]
