#!/usr/bin/env bash
# One-time provisioning for an Ubuntu 24.04 VM (safe to re-run).
# Usage, from your Mac:
#   gcloud compute ssh interview-prep --zone us-central1-a --command "sudo bash -s -- \$USER <site-host>" < deploy/setup-vm.sh
set -euo pipefail

APP_USER="$1"
SITE="$2"
APP_DIR=/opt/interview-prep

# 2 GB swap: an e2-micro has 1 GB RAM, too little for `next build`.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y git caddy

if [ ! -d "$APP_DIR" ]; then
  git clone https://github.com/urperfectdude/interview-prep.git "$APP_DIR"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

for app in server web; do
  cat > "/etc/systemd/system/interview-prep-$app.service" <<EOF
[Unit]
Description=interview-prep $app
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/apps/$app
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always

[Install]
WantedBy=multi-user.target
EOF
done
systemctl daemon-reload
systemctl enable interview-prep-server interview-prep-web

# One origin for both apps keeps the SameSite=Lax session cookie first-party.
cat > /etc/caddy/Caddyfile <<EOF
$SITE {
	handle /api/* {
		reverse_proxy localhost:4000
	}
	handle /health {
		reverse_proxy localhost:4000
	}
	handle {
		reverse_proxy localhost:3000
	}
}
EOF
systemctl reload caddy
