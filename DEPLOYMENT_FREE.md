# Free-Tier Deployment Guide: Vercel, Render & Cloud Options

This guide provides two complete, battle-tested options for deploying the Personal Finance Portal (**Folio / Spendify**) on free-tier infrastructure.

- **Option 1 (Recommended): Cloud Native Stack**
  - **Frontend:** [Vercel](https://vercel.com) (Edge CDN, Automated Git Deployments, Free SSL)
  - **Backend API:** [Render](https://render.com) or [Koyeb](https://koyeb.com) (Free Go Container/Native Web Service)
  - **Database:** [TiDB Cloud](https://tidbcloud.com) or [Aiven](https://aiven.io) (Free 5GB–25GB MySQL 8-compatible Serverless database, no credit card required)
- **Option 2: Single-VM Self-Hosted Stack**
  - Oracle Cloud Infrastructure (OCI) Always Free Ubuntu VM running MySQL 8, Go API, and Nginx reverse proxy.

---

# OPTION 1: Vercel + Render + TiDB Cloud (Recommended)

This setup requires **no credit card**, takes less than 10 minutes, and automatically deploys on every `git push`.

```
+-------------------------------------------------------------+
|                       END USER BROWSER                      |
+-------------------------------------------------------------+
                               |
                               | HTTPS Requests
                               v
+-------------------------------------------------------------+
|                      VERCEL (FRONTEND)                      |
|       - React 18 + Vite SPA on Global Edge Network          |
|       - vercel.json handles client-side routing & rewrites  |
+-------------------------------------------------------------+
                               |
                               | /api/* requests (proxied or direct)
                               v
+-------------------------------------------------------------+
|                    RENDER (GO BACKEND API)                  |
|       - Go 1.22+ Gin Framework HTTP Server                 |
|       - Auto-runs migrations on startup                     |
+-------------------------------------------------------------+
                               |
                               | TLS TCP Connection (Port 4000/3306)
                               v
+-------------------------------------------------------------+
|                 TIDB CLOUD (MYSQL 8 DATABASE)               |
|       - 100% Free Serverless MySQL-compatible cluster       |
|       - Persistent storage (up to 5GB free forever)         |
+-------------------------------------------------------------+
```

---

## Step 1: Create a Free MySQL Database (2 Minutes)

Because Vercel is a serverless platform, you need a cloud-hosted MySQL database. **TiDB Cloud Serverless** provides a 100% free MySQL-compatible instance without requiring a credit card:

1. Sign up for free at [tidbcloud.com](https://tidbcloud.com) (or [aiven.io](https://aiven.io)).
2. Click **Create Cluster** → choose **Serverless (Free)**.
3. Select any region (e.g., `AWS / us-east-1` or region closest to you).
4. Click **Create**. Your cluster is provisioned in ~15 seconds.
5. In the cluster dashboard, click **Connect** → choose **Connect with General Client** (or Golang):
   - Note down: `Host`, `Port` (typically `4000`), `User`, `Password`, and `Database` name (e.g., `test` or `finance_portal`).
6. Your connection string (`DB_DSN`) format will look like:
   ```dotenv
   DB_DSN=your_user.root:your_password@tcp(gateway01.us-east-1.prod.aws.tidbcloud.com:4000)/finance_portal?tls=true&charset=utf8mb4&parseTime=True&loc=Local
   ```

---

## Step 2: Deploy the Go API on Render (Free Tier)

Render hosts backend services for free with automatic SSL.

1. Push your project to a GitHub repository:
   ```bash
   git add .
   git commit -m "feat: ready for cloud deployment"
   git push origin main
   ```
2. Log in to [render.com](https://render.com) using your GitHub account.
3. In the Render Dashboard, click **New +** → **Web Service**.
4. Select your GitHub repository.
5. Fill in the service configuration:
   - **Name:** `spendify-backend-api`
   - **Region:** Same region as your database (e.g. `Ohio (US East)`)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Go` (or choose `Docker` to use `backend/Dockerfile`)
   - **Build Command:** `go build -o server ./cmd/server`
   - **Start Command:** `./server`
   - **Instance Type:** `Free`
6. Add the **Environment Variables** in the Render console:
   | Key | Value | Notes |
   |---|---|---|
   | `PORT` | `8080` | Render defaults to port 8080 or 10000 |
   | `ENV` | `production` | Enables secure cookie mode |
   | `DB_DSN` | *(Your TiDB Cloud connection string from Step 1)* | Must include `?tls=true&parseTime=True` |
   | `JWT_ACCESS_SECRET` | *(64-character random string)* | E.g. generate via `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | *(Different 64-character random string)* | E.g. generate via `openssl rand -hex 32` |
   | `CORS_ORIGIN` | `https://YOUR-APP.vercel.app` | Can temporarily use `*` until Vercel URL is ready |
7. Click **Create Web Service**.
8. Once built and running, Render will assign your backend a public URL:
   `https://spendify-backend-api.onrender.com`
9. Test the health endpoint in your browser:
   `https://spendify-backend-api.onrender.com/health` → `{"status":"ok"}`.

---

## Step 3: Deploy the React Frontend on Vercel

### Method A: Connect Git Repository to Vercel (Recommended)

1. Log in to [vercel.com](https://vercel.com) with GitHub.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Project Name:** `spendify-portal`
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** → select `frontend` (or leave as root; both `frontend/vercel.json` and `./vercel.json` are pre-configured).
   - **Build and Output Settings:**
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`
5. Expand **Environment Variables** and add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://spendify-backend-api.onrender.com/api/v1` | Your live Render backend API URL |
6. Click **Deploy**.
7. Vercel builds and deploys your application in ~30 seconds and outputs your live URL:
   `https://spendify-portal.vercel.app`.

---

## Step 4: Finalize CORS & Cookie Alignment

To ensure cross-origin authentication and refresh tokens function smoothly between Vercel and Render:

1. Return to your **Render Dashboard** → `spendify-backend-api` → **Environment**.
2. Update `CORS_ORIGIN` to match your exact Vercel URL:
   ```dotenv
   CORS_ORIGIN=https://spendify-portal.vercel.app
   ```
   *(Ensure there is no trailing slash).*
3. Save changes. Render will automatically redeploy the backend with the new allowed origin.

### Optional: Vercel Reverse Proxy Rewrites (Zero-CORS Same-Origin Mode)
If you prefer the frontend and backend to appear on the *exact same domain*, you can use Vercel's Edge Rewrites. In `frontend/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:match*",
      "destination": "https://spendify-backend-api.onrender.com/api/:match*"
    },
    {
      "source": "/health",
      "destination": "https://spendify-backend-api.onrender.com/health"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
When this rewrite is active:
- Leave `VITE_API_URL` unset (or `/api/v1`).
- The browser sends all API calls to `https://spendify-portal.vercel.app/api/v1/...`.
- Vercel forwards requests securely to Render.
- HttpOnly refresh cookies work transparently without cross-site cookie restrictions!

---

## Step 5: Post-Deployment Verification

1. **Verify SPA Routing:** Open your Vercel deployment URL (`https://spendify-portal.vercel.app/`). Navigate to `/transactions`, `/budgets`, `/goals`, and `/profile`. Refresh the browser on any sub-page to confirm that Vercel's rewrite rule prevents 404 errors.
2. **Register a User:** Click Register, fill in your details, and create an account. Check that you are automatically redirected to the dashboard.
3. **Verify Features:**
   - Test adding a transaction.
   - Click **Excel / CSV Engine** → download the sample template (`.xlsx`).
   - Test category management and savings goal creation.
   - Go to **Settings** → test updating profile data and password change.

---

# OPTION 2: Single-VM Self-Hosted Stack (OCI Always Free)

This guide deploys the entire application on one Oracle Cloud Infrastructure (OCI) Always Free Ubuntu VM. The VM runs MySQL 8 in Docker, the Go API via systemd, and Nginx to serve the built React app and reverse-proxy API requests on the same HTTPS origin.

## 1. Provision and Secure the VM

1. In the OCI Console, create an Always Free Ubuntu ARM64 instance (`VM.Standard.A1.Flex`).
2. Allow ports `22` (SSH), `80` (HTTP), and `443` (HTTPS) in the VM security list.
3. Connect via SSH:
   ```bash
   ssh -i /path/to/private-key ubuntu@YOUR_VM_PUBLIC_IP
   ```
4. Install base packages:
   ```bash
   sudo apt update && sudo apt install -y git nginx certbot python3-certbot-nginx ca-certificates curl rsync
   ```

## 2. Start MySQL 8 Database Container

```bash
sudo install -d -m 700 /etc/spendify
sudo tee /etc/spendify/mysql.env > /dev/null <<'EOF'
MYSQL_DATABASE=finance_portal
MYSQL_USER=finance_user
MYSQL_PASSWORD=replace_with_strong_password
MYSQL_ROOT_PASSWORD=replace_with_strong_root_password
EOF

sudo chmod 600 /etc/spendify/mysql.env

sudo docker run -d \
  --name spendify-mysql \
  --restart unless-stopped \
  --env-file /etc/spendify/mysql.env \
  -p 127.0.0.1:3306:3306 \
  -v spendify-mysql:/var/lib/mysql \
  mysql:8.0
```

## 3. Build & Run the Go API

```bash
git clone https://github.com/OWNER/REPOSITORY.git "$HOME/spendify"

sudo tee /etc/spendify/backend.env > /dev/null <<'EOF'
PORT=8080
ENV=production
DB_DSN=finance_user:replace_with_strong_password@tcp(127.0.0.1:3306)/finance_portal?charset=utf8mb4&parseTime=True&loc=Local
JWT_ACCESS_SECRET=replace_with_random_secret_1
JWT_REFRESH_SECRET=replace_with_random_secret_2
CORS_ORIGIN=https://spendify.yourdomain.com
EOF

sudo chmod 600 /etc/spendify/backend.env

cd "$HOME/spendify/backend"
go build -o "$HOME/spendify-api" ./cmd/server
```

Create the systemd service `/etc/systemd/system/spendify-api.service`:
```ini
[Unit]
Description=Spendify Backend API
After=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/spendify/backend
EnvironmentFile=/etc/spendify/backend.env
ExecStart=/home/ubuntu/spendify-api
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now spendify-api
```

## 4. Build Frontend & Configure Nginx

```bash
cd "$HOME/spendify/frontend"
npm install
npm run build
sudo install -d -o ubuntu -g ubuntu /var/www/spendify
sudo rsync -a --delete dist/ /var/www/spendify/
```

Configure Nginx `/etc/nginx/sites-available/spendify`:
```nginx
server {
    listen 80;
    server_name spendify.yourdomain.com;
    root /var/www/spendify;
    index index.html;
    client_max_body_size 15m;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health {
        proxy_pass http://127.0.0.1:8080/health;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and acquire SSL:
```bash
sudo ln -s /etc/nginx/sites-available/spendify /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d spendify.yourdomain.com
```

---

## Common Deployment Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **Vercel 404 on page refresh** | Single Page Application (SPA) routing requires index fallback | Ensure `vercel.json` contains `"source": "/(.*)", "destination": "/index.html"` |
| **CORS Blocked in Browser** | Backend `CORS_ORIGIN` does not match Vercel URL | Update `CORS_ORIGIN` on Render to your exact Vercel URL (e.g. `https://your-app.vercel.app`) |
| **HttpOnly cookie not saved** | Browser blocking cross-domain cookies | Use the Vercel Reverse Proxy configuration in `vercel.json` so API calls stay on the same origin |
| **Render spin-down cold start** | Free-tier Render web services sleep after 15 min of inactivity | Normal behavior on free tier (~30-50s wake up time); upgrade to Starter or use a free cron pinger like UptimeRobot to ping `/health` |
| **MySQL connection refused** | Missing TLS parameter or incorrect host | For TiDB Cloud, ensure connection string includes `?tls=true&charset=utf8mb4&parseTime=True` |
