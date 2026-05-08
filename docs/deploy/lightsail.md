# Deploy AppSeed on AWS Lightsail

**Cost:** ~$3.50-5/month for a 512 MB or 1 GB instance.

Lightsail is AWS's simplified VPS offering. You get a full Ubuntu instance with a static IP, which is ideal for running Docker Compose with SQLite + Litestream — exactly like a traditional VPS but inside the AWS ecosystem.

---

## Approach 1: Lightsail Instance (Recommended)

This is the recommended approach. You get a full Ubuntu VM with persistent disk, Docker, and Caddy for automatic HTTPS. The existing `docker-compose.lightsail.yml` handles everything.

### Prerequisites

- An AWS account
- A domain name with DNS you can control
- (Optional) An S3 bucket or S3-compatible store for Litestream backups

### Step 1: Create the Lightsail Instance

1. Go to [Lightsail console](https://lightsail.aws.amazon.com/)
2. Click **Create instance**
3. Choose **Linux/Unix** > **OS Only** > **Ubuntu 22.04 LTS**
4. Pick an instance plan:
   - **$3.50/mo (512 MB)** — works for low-traffic apps
   - **$5/mo (1 GB)** — recommended for production
5. Name it (e.g., `appseed-prod`) and click **Create instance**

### Step 2: Assign a Static IP

1. In the Lightsail console, go to **Networking**
2. Click **Create static IP**
3. Attach it to your instance
4. Note the IP address

### Step 3: Configure DNS

Point your domain to the static IP:

```
A   @       → <your-static-ip>
A   www     → <your-static-ip>
```

Wait for DNS propagation (usually 1-5 minutes with low TTL).

### Step 4: Open Firewall Ports

In the Lightsail console, go to your instance > **Networking** > **IPv4 Firewall**:

| Rule       | Protocol | Port Range |
|------------|----------|------------|
| SSH        | TCP      | 22         |
| HTTP       | TCP      | 80         |
| HTTPS      | TCP      | 443        |

SSH (22) is open by default. Add HTTP (80) and HTTPS (443).

### Step 5: SSH In and Install Docker

```bash
# Connect via Lightsail browser terminal or SSH
ssh -i ~/.ssh/LightsailDefaultKey-*.pem ubuntu@<your-static-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Log out and back in for group change to take effect
exit
ssh -i ~/.ssh/LightsailDefaultKey-*.pem ubuntu@<your-static-ip>

# Verify
docker --version
docker compose version
```

### Step 6: Clone Your Repo

```bash
cd ~
git clone https://github.com/your-org/your-app.git
cd your-app
```

Or use `scp`/`rsync` to upload your project files.

### Step 7: Create the Environment File

```bash
cd ~/your-app/deploy/lightsail
cp .env.example .env  # if you have one, or create from scratch
```

Create `.env` with your production values:

```env
# Required
DOMAIN=yourdomain.com
BETTER_AUTH_SECRET=<openssl rand -base64 32>
APP_NAME=YourApp

# OAuth (omit to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
RESEND_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=

# Litestream (optional but strongly recommended)
LITESTREAM_ACCESS_KEY_ID=
LITESTREAM_SECRET_ACCESS_KEY=
LITESTREAM_REPLICA_BUCKET=your-backup-bucket
LITESTREAM_REPLICA_PATH=db
LITESTREAM_REPLICA_ENDPOINT=https://s3.us-east-1.amazonaws.com
LITESTREAM_REPLICA_REGION=us-east-1
```

### Step 8: Deploy

```bash
cd ~/your-app/deploy/lightsail

# Build and start everything
DOCKER_BUILDKIT=0 docker compose -f docker-compose.lightsail.yml up -d --build
```

Caddy will automatically obtain a TLS certificate from Let's Encrypt on first request. This takes a few seconds.

### Step 9: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.lightsail.yml ps

# Check app logs
docker logs appseed-app --tail 50

# Check Caddy logs (TLS cert acquisition)
docker logs appseed-caddy --tail 50

# Test the health endpoint
curl https://yourdomain.com/api/health
```

### Updating

```bash
cd ~/your-app
git pull
cd deploy/lightsail
DOCKER_BUILDKIT=0 docker compose -f docker-compose.lightsail.yml up -d --build
```

### Restoring from Litestream Backup

If you need to restore the database from an S3 backup (e.g., migrating to a new instance):

```bash
# Stop the app and litestream
docker compose -f docker-compose.lightsail.yml down

# Find the volume mount point
docker volume inspect deploy_lightsail_app_data

# Run a one-off litestream restore
docker run --rm \
  -v deploy_lightsail_app_data:/data \
  -e LITESTREAM_ACCESS_KEY_ID=<key> \
  -e LITESTREAM_SECRET_ACCESS_KEY=<secret> \
  litestream/litestream:latest restore \
  -o /data/appseed.db \
  s3://<bucket>/<path>/appseed.db

# Start everything back up
docker compose -f docker-compose.lightsail.yml up -d
```

---

## Approach 2: Lightsail Containers (With Caveats)

Lightsail also offers a managed container service. This is simpler to operate (no SSH, no OS patching) but has a significant limitation: **no persistent volumes**.

This means your SQLite database lives inside the container and is lost on every redeployment. You **must** use Litestream restore-on-boot to make this work.

### Why This Is Tricky

- Every deploy creates a fresh container with no data
- You need a custom entrypoint that restores the database from S3 before starting the app
- Writes between the last Litestream snapshot and a container restart are lost (typically 1-10 seconds of data)
- Litestream runs inside the same container (no sidecar support)

### When to Use This

- You want fully managed infrastructure with no server maintenance
- Your app can tolerate a few seconds of data loss on restarts
- You are comfortable building a custom Docker image with Litestream baked in

### Container Service Setup

1. **Create a container service** in the Lightsail console
   - Power: Nano ($7/mo) or Micro ($10/mo)
   - Scale: 1

2. **Build a custom image** that includes Litestream and a restore-on-boot entrypoint:

```dockerfile
FROM node:20-alpine AS base

# ... (standard build stages from your Dockerfile) ...

FROM base AS runner
WORKDIR /app

# Install Litestream
ADD https://github.com/benbjohnson/litestream/releases/latest/download/litestream-linux-amd64.tar.gz /tmp/litestream.tar.gz
RUN tar -xzf /tmp/litestream.tar.gz -C /usr/local/bin && rm /tmp/litestream.tar.gz

# Copy app files (same as your standard Dockerfile)
# ...

# Custom entrypoint: restore DB then start app + replicate
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

3. **Create `entrypoint.sh`:**

```bash
#!/bin/sh
set -e

# Restore database from S3 if it exists
echo "Restoring database from Litestream..."
litestream restore -if-db-not-exists -if-replica-exists \
  -o "$DATABASE_PATH" \
  "s3://$LITESTREAM_REPLICA_BUCKET/$LITESTREAM_REPLICA_PATH/$(basename $DATABASE_PATH)"

# Start Litestream replication in the background
litestream replicate -config /etc/litestream.yml &

# Start the app
exec node_modules/.bin/next start -p 3013
```

4. **Push the image** to Lightsail's container registry or Amazon ECR, then create a deployment.

5. **Set environment variables** in the Lightsail container service configuration (same variables as the `.env` file above).

### Limitations to Understand

| Concern | Instance approach | Container approach |
|---------|------------------|--------------------|
| Persistent disk | Yes (Docker volumes) | No (ephemeral) |
| Data loss on restart | None | Up to ~10s of writes |
| Litestream | Sidecar container | Baked into app image |
| SSH access | Yes | No |
| OS patching | You handle it | AWS handles it |
| Cost | $3.50-5/mo | $7-10/mo |
| Complexity | Medium | Higher |

For most AppSeed deployments, the **instance approach is recommended** due to persistent storage, lower cost, and simpler operations.

---

## S3 Bucket for Litestream

If you don't already have an S3 bucket for backups:

```bash
# Create a bucket
aws s3 mb s3://your-app-backups --region us-east-1

# Create an IAM user for Litestream
aws iam create-user --user-name litestream-backup

# Attach a policy (create a file: litestream-policy.json)
cat > /tmp/litestream-policy.json << 'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-app-backups",
        "arn:aws:s3:::your-app-backups/*"
      ]
    }
  ]
}
POLICY

aws iam put-user-policy \
  --user-name litestream-backup \
  --policy-name LitestreamS3Access \
  --policy-document file:///tmp/litestream-policy.json

# Create access keys
aws iam create-access-key --user-name litestream-backup
```

Use the returned `AccessKeyId` and `SecretAccessKey` as `LITESTREAM_ACCESS_KEY_ID` and `LITESTREAM_SECRET_ACCESS_KEY`.

You can also use S3-compatible services like Cloudflare R2, Backblaze B2, or MinIO — just set `LITESTREAM_REPLICA_ENDPOINT` accordingly.

---

## Troubleshooting

### Caddy can't get a TLS certificate

- Make sure ports 80 and 443 are open in the Lightsail firewall
- Verify DNS is pointing to the correct IP: `dig yourdomain.com`
- Check Caddy logs: `docker logs appseed-caddy`

### App won't start

- Check logs: `docker logs appseed-app`
- Verify `.env` has all required variables (especially `BETTER_AUTH_SECRET` and `DOMAIN`)
- Ensure `DOCKER_BUILDKIT=0` is set during build (BuildKit can hang on Alpine)

### Database is empty after restart (container approach only)

- Verify Litestream credentials are correct
- Check that the S3 bucket contains replica data: `aws s3 ls s3://your-bucket/db/`
- Test a manual restore: `litestream restore -o /tmp/test.db s3://your-bucket/db/appseed.db`

### Instance running out of memory (512 MB plan)

- The Docker build step is memory-intensive. Build locally and push the image instead:
  ```bash
  # On your local machine
  DOCKER_BUILDKIT=0 docker build -t your-app ./node
  docker save your-app | gzip > your-app.tar.gz
  scp your-app.tar.gz ubuntu@<ip>:~

  # On the Lightsail instance
  docker load < your-app.tar.gz
  ```
- Or upgrade to the $5/mo (1 GB) plan
