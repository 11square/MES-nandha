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
echo "[2/5] Installing backend dependencies..."
cd $APP_DIR/mespro_backend
npm install --production

# Install frontend deps & build
echo "[3/5] Installing frontend dependencies..."
cd $APP_DIR/mespro_frontend
npm install

echo "[4/5] Building frontend..."
npx vite build --outDir build

# Restart services
echo "[5/5] Restarting services..."
pm2 restart mespro-backend
pm2 save
systemctl reload nginx

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: https://ramcooindustries.online/"
echo "Backend:  https://ramcooindustries.online/api/"
