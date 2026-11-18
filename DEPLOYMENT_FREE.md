# Free-Tier Deployment Guide

This guide deploys Spendify on one Oracle Cloud Infrastructure (OCI) Always Free Ubuntu VM. The VM runs MySQL 8, the Go API, and Nginx; Nginx serves the built React app and proxies API requests on the same HTTPS origin.

This avoids a paid managed database and cross-site refresh-cookie issues. OCI free capacity and terms can change, so this is not a guarantee of permanent zero cost or uptime.

## What you need

- An OCI account and an Always Free-eligible Ubuntu VM. OCI currently documents up to 2 OCPUs and 12 GB of memory for Ampere A1 Always Free compute.
- A Git clone URL for this project.
- A DNS name pointing to the VM's public IP. A free dynamic-DNS subdomain such as [DuckDNS](https://www.duckdns.org/) can work; a registered domain may cost money.
- SSH access to the VM.
- Go at the version declared in `backend/go.mod` (currently Go 1.26.0), Node.js 20 or later, and Docker Engine.

Read OCI's [Always Free resource limits](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) before provisioning. In the console, check that each resource is marked **Always Free-eligible** and verify the cost estimate is $0, including any public IP or storage choices. Do not create paid resources or upgrade the account for this guide. Sign-up may require a payment card for identity verification. Capacity can be unavailable, and OCI may reclaim idle compute instances.

## 1. Provision and secure the VM

Create an Ubuntu ARM64 VM using the Always Free-eligible `VM.Standard.A1.Flex` shape. Keep the CPU, memory, and boot volume within the current Always Free allowance. Save the private SSH key securely.

In the VM's network security rules:

- Allow SSH (port 22) only from your own IP address.
- Allow HTTP (port 80) and HTTPS (port 443) for web traffic.
- Do **not** open MySQL (3306) or the API port (8080) to the internet.

Connect using the SSH key and default Ubuntu account:

```bash
ssh -i /path/to/private-key ubuntu@YOUR_VM_PUBLIC_IP
```

Install the base tools:

```bash
sudo apt update
sudo apt install -y git nginx certbot python3-certbot-nginx ca-certificates curl rsync
```

Install Docker Engine using Docker's [official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). Install Go and Node.js using their official instructions, then confirm the versions:

```bash
go version
node --version
npm --version
docker --version
```

## 2. Start a private MySQL 8 database

Create a root-only directory and a secrets file:

```bash
sudo install -d -m 700 /etc/spendify
sudoedit /etc/spendify/mysql.env
```

Add these values, replacing both passwords with different long random hexadecimal values. You can generate one with `openssl rand -hex 32`:

```dotenv
MYSQL_DATABASE=finance_portal
MYSQL_USER=finance_user
MYSQL_PASSWORD=REPLACE_WITH_RANDOM_HEX_PASSWORD
MYSQL_ROOT_PASSWORD=REPLACE_WITH_A_DIFFERENT_RANDOM_HEX_PASSWORD
```

Save the file, then restrict its permissions and start MySQL. The published port is bound to loopback only, and the named Docker volume keeps database files across container restarts:

```bash
sudo chmod 600 /etc/spendify/mysql.env
sudo docker run -d \
  --name spendify-mysql \
  --restart unless-stopped \
  --env-file /etc/spendify/mysql.env \
  -p 127.0.0.1:3306:3306 \
  -v spendify-mysql:/var/lib/mysql \
  mysql:8.0
```

Wait for MySQL to become ready:

```bash
until sudo docker exec spendify-mysql mysqladmin ping -h 127.0.0.1 --silent; do sleep 2; done
```

## 3. Clone the project and configure the API

Clone your repository (replace the example URL with your own):

```bash
git clone https://github.com/OWNER/REPOSITORY.git "$HOME/spendify"
```

Create the API environment file outside the repository:

```bash
sudoedit /etc/spendify/backend.env
```

Set the MySQL password to the same hexadecimal value used in `mysql.env`. Generate two **different** JWT secrets with `openssl rand -hex 32`. Replace the example hostname with the DNS name configured for this VM:

```dotenv
PORT=8080
ENV=production
DB_DSN=finance_user:REPLACE_WITH_MYSQL_PASSWORD@tcp(127.0.0.1:3306)/finance_portal?charset=utf8mb4&parseTime=True&loc=Local
JWT_ACCESS_SECRET=REPLACE_WITH_FIRST_RANDOM_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_DIFFERENT_RANDOM_SECRET
CORS_ORIGIN=https://spendify.example.duckdns.org
```

Protect the file and build the API:

```bash
sudo chmod 600 /etc/spendify/backend.env
cd "$HOME/spendify/backend"
go mod download
go build -o "$HOME/spendify-api" ./cmd/server
```

The API automatically creates and migrates its database tables when it starts.

Create a systemd service so the API restarts after a reboot:

```bash
sudo tee /etc/systemd/system/spendify-api.service >/dev/null <<'SERVICE'
[Unit]
Description=Spendify API
After=network-online.target docker.service
Wants=network-online.target

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
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now spendify-api
sudo systemctl status spendify-api
```

If you use a Linux account other than `ubuntu`, update `User`, `WorkingDirectory`, and `ExecStart` in the service file to match it.

## 4. Build the frontend

The frontend's default API URL is the relative path `/api/v1`. Keep it relative so browser requests go through Nginx to the API on the same origin.

```bash
cd "$HOME/spendify/frontend"
npm install
VITE_API_URL=/api/v1 npm run build
sudo install -d -o ubuntu -g ubuntu /var/www/spendify
sudo rsync -a --delete dist/ /var/www/spendify/
```

## 5. Configure Nginx and HTTPS

Create an Nginx site. Replace `spendify.example.duckdns.org` with your actual DNS name:

```bash
sudo tee /etc/nginx/sites-available/spendify >/dev/null <<'NGINX'
server {
    listen 80;
    server_name spendify.example.duckdns.org;
    root /var/www/spendify;
    index index.html;
    client_max_body_size 10m;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/spendify /etc/nginx/sites-enabled/spendify
sudo nginx -t
sudo systemctl reload nginx
```

Make sure your DNS name resolves to the VM and port 80 is reachable, then request a free TLS certificate:

Create an `A` record for your hostname that points to the VM's public IPv4 address. Wait for DNS to resolve before requesting the certificate.

```bash
sudo certbot --nginx -d spendify.example.duckdns.org
```

Choose the option to redirect HTTP to HTTPS. `ENV=production` makes the refresh cookie secure, so use the HTTPS URL when testing. The frontend and API share the same origin; keep `CORS_ORIGIN` set to that exact origin, including `https://` and without a trailing slash.

## 6. Verify the deployment

Check the API and Nginx:

```bash
curl -fsS https://spendify.example.duckdns.org/health
sudo systemctl status spendify-api
sudo journalctl -u spendify-api -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

Open the HTTPS site, register a new account, and test login and refresh. Do not run the demo seeder on a public deployment unless you change or remove its documented demo credentials.

## Updates and backups

Before updating, take a database backup and copy it off the VM. For example:

```bash
sudo docker exec spendify-mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot "$MYSQL_DATABASE"' \
  > "$HOME/spendify-backup-$(date +%F).sql"
```

Then update and rebuild:

```bash
cd "$HOME/spendify"
git pull
cd frontend
npm install
VITE_API_URL=/api/v1 npm run build
sudo rsync -a --delete dist/ /var/www/spendify/
cd ../backend
go mod download
go build -o "$HOME/spendify-api" ./cmd/server
sudo systemctl restart spendify-api
```

Download backups to another device; a backup stored only on the VM will not protect against VM or account loss.

## Security and free-tier limitations

- This is an academic project, not a hardened financial service. The current API does not rate-limit login attempts. Do not store bank credentials, payment-card details, or sensitive real financial records in a public demo.
- Keep both secrets files outside Git, never expose ports 3306 or 8080 publicly, use HTTPS, and restrict SSH access.
- Free-tier capacity, usage terms, and provider pricing can change. Free resources may be reclaimed or unavailable, and there is no production uptime guarantee. Keep external backups and check the provider's cost estimate and current terms regularly.
- A temporary [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) can provide a URL for a short demonstration without a domain, but its hostname changes and Cloudflare documents it for testing, not production.
