#!/bin/bash
# Deploy MESPRO to Hostinger VPS
# Usage: ssh root@72.60.99.225 'bash -s' < deploy.sh

set -e

SERVER="root@72.60.99.225"
APP_DIR="/var/www/MES-nandha"

echo "=== MESPRO Deployment ==="

# Pull latest code
echo "[1/5] Pulling latest code..."
cd $APP_DIR
git stash 2>/dev/null || true
git pull origin main

# Install backend deps
echo "[2/6] Installing backend dependencies..."
cd $APP_DIR/mespro_backend
npm install --production

# Run database migrations (idempotent — safe to run every deploy)
echo "[3/6] Running database migrations..."
npx sequelize-cli db:migrate

# Install frontend deps & build
echo "[4/6] Installing frontend dependencies..."
cd $APP_DIR/mespro_frontend
npm install

echo "[5/6] Building frontend..."
npx vite build --outDir build

# Restart services
echo "[6/6] Restarting services..."
pm2 restart mespro-backend
pm2 save
systemctl reload nginx

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: https://ramcooindustries.online/"
echo "Backend:  https://ramcooindustries.online/api/"
