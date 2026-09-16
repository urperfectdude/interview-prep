#!/usr/bin/env bash
# Deploy origin/main to the VM: pull, install, migrate, build, restart.
set -euo pipefail

VM="${VM:-interview-prep}"
ZONE="${ZONE:-us-central1-a}"

gcloud compute ssh "$VM" --zone "$ZONE" --ssh-flag="-o ServerAliveInterval=30" --command '
  set -euo pipefail
  cd /opt/interview-prep
  git pull --ff-only
  npm ci
  (cd apps/server && npx prisma migrate deploy)
  NODE_OPTIONS=--max-old-space-size=1536 npm run build
  sudo systemctl restart interview-prep-server interview-prep-web
'
