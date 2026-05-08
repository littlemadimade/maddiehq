#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AppSeed EC2 User-Data (cloud-init) Script
# ─────────────────────────────────────────────────────────────────────────────
# This script runs once on first boot. It installs Docker, clones the repo,
# sets up the systemd service, and optionally configures Caddy for HTTPS.
#
# Usage — paste into EC2 "User data" field (Advanced Details) at launch, or
# reference it in a CloudFormation template via AWS::EC2::Instance UserData.
#
# Prerequisites:
#   - Amazon Linux 2023 or Ubuntu 22.04/24.04 AMI
#   - Instance role with S3 access (if using Litestream backups)
#   - Security group allowing inbound 22, 80, 443
#
# Configuration — edit these variables before launching:
# ─────────────────────────────────────────────────────────────────────────────

APP_REPO="https://github.com/YOUR_ORG/YOUR_REPO.git"
APP_BRANCH="main"
APP_DIR="/opt/appseed"
DOMAIN=""  # e.g. "app.example.com" — leave empty to skip Caddy/HTTPS setup

# ─────────────────────────────────────────────────────────────────────────────
# 1. System updates
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
exec > >(tee /var/log/appseed-init.log) 2>&1
echo ">>> AppSeed cloud-init starting at $(date -u)"

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="$ID"
else
  OS_ID="unknown"
fi

case "$OS_ID" in
  amzn)
    dnf update -y
    ;;
  ubuntu|debian)
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y && apt-get upgrade -y
    ;;
  *)
    echo "WARNING: Unsupported OS ($OS_ID). Attempting to continue..."
    ;;
esac

# ─────────────────────────────────────────────────────────────────────────────
# 2. Install Docker + Docker Compose
# ─────────────────────────────────────────────────────────────────────────────
case "$OS_ID" in
  amzn)
    dnf install -y docker git
    systemctl enable --now docker
    # Install Docker Compose plugin
    DOCKER_COMPOSE_VERSION="v2.29.1"
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    ;;
  ubuntu|debian)
    apt-get install -y ca-certificates curl gnupg git
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    ;;
esac

# Add ec2-user / ubuntu to docker group
for u in ec2-user ubuntu; do
  id "$u" &>/dev/null && usermod -aG docker "$u" || true
done

# ─────────────────────────────────────────────────────────────────────────────
# 3. Clone repo and configure
# ─────────────────────────────────────────────────────────────────────────────
git clone --branch "$APP_BRANCH" "$APP_REPO" "$APP_DIR"

# Create .env from example if it doesn't exist
if [ ! -f "$APP_DIR/.env" ] && [ -f "$APP_DIR/.env.example" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo ">>> Created .env from .env.example — edit /opt/appseed/.env with real values"
fi

# Generate BETTER_AUTH_SECRET if not already set
if [ -f "$APP_DIR/.env" ] && ! grep -q "^BETTER_AUTH_SECRET=.\+" "$APP_DIR/.env"; then
  SECRET=$(openssl rand -base64 32)
  sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$SECRET|" "$APP_DIR/.env" 2>/dev/null || \
    echo "BETTER_AUTH_SECRET=$SECRET" >> "$APP_DIR/.env"
  echo ">>> Generated BETTER_AUTH_SECRET"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. EBS data volume (if attached as /dev/xvdf or /dev/nvme1n1)
# ─────────────────────────────────────────────────────────────────────────────
DATA_DEVICE=""
for dev in /dev/xvdf /dev/nvme1n1; do
  if [ -b "$dev" ]; then
    DATA_DEVICE="$dev"
    break
  fi
done

if [ -n "$DATA_DEVICE" ]; then
  # Only format if no filesystem exists
  if ! blkid "$DATA_DEVICE" | grep -q TYPE; then
    mkfs.ext4 "$DATA_DEVICE"
    echo ">>> Formatted $DATA_DEVICE as ext4"
  fi

  mkdir -p /data
  mount "$DATA_DEVICE" /data

  # Add to fstab for persistence across reboots
  UUID=$(blkid -s UUID -o value "$DATA_DEVICE")
  if ! grep -q "$UUID" /etc/fstab; then
    echo "UUID=$UUID /data ext4 defaults,nofail 0 2" >> /etc/fstab
  fi

  # Create docker volume symlink so compose volumes land on EBS
  mkdir -p /data/docker-volumes
  echo ">>> EBS volume mounted at /data"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. Install systemd service
# ─────────────────────────────────────────────────────────────────────────────
cp "$APP_DIR/deploy/ec2/appseed.service" /etc/systemd/system/appseed.service
systemctl daemon-reload
systemctl enable appseed

# ─────────────────────────────────────────────────────────────────────────────
# 6. Optional: Caddy for automatic HTTPS
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "$DOMAIN" ]; then
  case "$OS_ID" in
    amzn)
      dnf install -y caddy || {
        dnf install -y 'dnf-command(copr)'
        dnf copr enable -y @caddy/caddy
        dnf install -y caddy
      }
      ;;
    ubuntu|debian)
      apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
      apt-get update -y
      apt-get install -y caddy
      ;;
  esac

  cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
    reverse_proxy localhost:3013
}
EOF

  systemctl enable --now caddy
  echo ">>> Caddy configured for ${DOMAIN} with automatic HTTPS"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. Start the application
# ─────────────────────────────────────────────────────────────────────────────
cd "$APP_DIR"
DOCKER_BUILDKIT=0 docker compose --profile prod up -d --build

echo ">>> AppSeed cloud-init complete at $(date -u)"
echo ">>> Application should be available on port 3013 (or via Caddy on 443 if DOMAIN was set)"
