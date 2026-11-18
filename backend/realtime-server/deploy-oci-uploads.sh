#!/usr/bin/env bash
set -e

echo "🚀 Deploying OCI Direct Upload Configuration to Production"
echo "============================================================"

cd /home/ubuntu/olentra-website

echo ""
echo "1️⃣  Pulling latest changes from git..."
git fetch origin main
git reset --hard origin/main

echo ""
echo "2️⃣  Installing dependencies for realtime-server..."
cd /home/ubuntu/olentra-website/backend/realtime-server
/usr/bin/bun install

echo ""
echo "3️⃣  Building realtime-server..."
/usr/bin/bun run build

echo ""
echo "4️⃣  Verifying OCI configuration in .env..."
if grep -q "INTERNSHIP_FILE_STORAGE=oci" .env; then
    echo "   ✅ OCI direct uploads enabled"
else
    echo "   ⚠️  OCI direct uploads not configured in .env"
fi

if grep -q "OCI_STORAGE_NAMESPACE=axoi3mp9fcx5" .env; then
    echo "   ✅ OCI namespace configured"
else
    echo "   ⚠️  OCI namespace not configured"
fi

if grep -q "OCI_STORAGE_BUCKET=olentrainternship" .env; then
    echo "   ✅ OCI storage bucket configured"
else
    echo "   ⚠️  OCI storage bucket not configured"
fi

if grep -q "OCI_QUARANTINE_BUCKET=olentrainternship-quarantine" .env; then
    echo "   ✅ OCI quarantine bucket configured"
else
    echo "   ⚠️  OCI quarantine bucket not configured"
fi

if grep -q "OCI_AUTH_MODE" .env; then
    echo "   ⚠️  Warning: OCI_AUTH_MODE set (should be unset for instance principals)"
else
    echo "   ✅ OCI_AUTH_MODE not set (will use instance principals)"
fi

echo ""
echo "5️⃣  Restarting olentra-realtime service..."
sudo systemctl restart olentra-realtime

echo ""
echo "6️⃣  Waiting for service to start..."
sleep 5

echo ""
echo "7️⃣  Checking service status..."
if sudo systemctl is-active --quiet olentra-realtime; then
    echo "   ✅ Service is active!"
else
    echo "   ❌ Service failed to start!"
    sudo systemctl status olentra-realtime --no-pager
    exit 1
fi

echo ""
echo "8️⃣  Verifying health endpoint..."
if curl -sf http://127.0.0.1:3003/health > /dev/null; then
    echo "   ✅ Health check passed!"
else
    echo "   ❌ Health check failed!"
    exit 1
fi

echo ""
echo "9️⃣  Checking direct upload configuration..."
UPLOAD_CONFIG=$(curl -s http://127.0.0.1:3003/intern/files/config)
echo "   Config: $UPLOAD_CONFIG"

if echo "$UPLOAD_CONFIG" | grep -q '"directUploads":true'; then
    echo "   ✅ Direct uploads enabled!"
else
    echo "   ⚠️  Direct uploads not enabled"
fi

echo ""
echo "============================================================"
echo "✅ Deployment successful!"
echo ""
echo "📝 Next Steps:"
echo "   1. Test upload flow from https://www.olentratechnologies.com"
echo "   2. Monitor logs: sudo journalctl -u olentra-realtime -f"
echo "   3. Check for any worker errors in logs"
