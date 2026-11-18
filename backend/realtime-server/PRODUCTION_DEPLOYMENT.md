# Production Deployment Guide for OCI Direct Uploads

## ✅ Local Testing Complete

All local tests passed:
- ✓ Direct uploads enabled and configured
- ✓ OCI storage connectivity verified
- ✓ Authentication/verification enforcement working
- ✓ Backend components initialized

## 📋 Production Deployment Checklist

### Step 1: Create IAM Policy (REQUIRED)

Ask the Oracle agent to create this IAM policy in your compartment:

```text
Allow service objectstorage-ap-hyderabad-1 to read buckets in compartment <your-compartment-name>
Allow service objectstorage-ap-hyderabad-1 to manage objects in compartment <your-compartment-name> where all {target.bucket.name='olentrainternship'}
Allow service objectstorage-ap-hyderabad-1 to manage objects in compartment <your-compartment-name> where all {target.bucket.name='olentrainternship-quarantine'}
```

Replace `<your-compartment-name>` with your actual compartment name.

### Step 2: Update Production .env

Add these lines to `/home/ubuntu/olentra-website/backend/realtime-server/.env` on the production server:

```bash
# OCI Direct Upload Configuration (Production - Instance Principals)
INTERNSHIP_FILE_STORAGE=oci
OCI_STORAGE_NAMESPACE=axoi3mp9fcx5
OCI_STORAGE_REGION=ap-hyderabad-1
OCI_STORAGE_BUCKET=olentrainternship
OCI_QUARANTINE_BUCKET=olentrainternship-quarantine
```

**Important:** Do NOT set `OCI_AUTH_MODE` or `OCI_CLI_PROFILE` in production. The backend will automatically use instance principals.

### Step 3: Deploy to Production

Run the deployment script:

```bash
ssh -i /Users/manidinuu/ORC-DS.key ubuntu@140.245.210.172 "cd /home/ubuntu/olentra-website/backend/realtime-server && bash deploy-oci-uploads.sh"
```

Or manually:

```bash
ssh -i /Users/manidinuu/ORC-DS.key ubuntu@140.245.210.172
cd /home/ubuntu/olentra-website
git pull origin main
cd backend/realtime-server
bun install
bun run build
sudo systemctl restart olentra-realtime
sudo systemctl status olentra-realtime
```

### Step 4: Verify Deployment

Check that direct uploads are enabled:

```bash
curl http://140.245.210.172:3003/intern/files/config
```

Should return: `{"ok":true,"data":{"directUploads":true}}`

### Step 5: Test Upload Flow

1. Go to https://www.olentratechnologies.com/careers/intern
2. Try uploading a resume
3. Monitor logs: `sudo journalctl -u olentra-realtime -f`

## 🔍 Troubleshooting

### "Production uploads require instance principals"
- Ensure IAM policy from Step 1 is created
- Ensure `OCI_AUTH_MODE` is NOT set in production .env

### "OCI upload buckets must be private"
- Verify both buckets have `NoPublicAccess` in OCI Console
- The system validates this on startup

### "Configure a private CLAMAV_HOST and valid port"
- For now, you can skip ClamAV (warning will be logged)
- To enable: Deploy ClamAV and set `CLAMAV_HOST` and `CLAMAV_PORT`

### Service fails to start
- Check logs: `sudo journalctl -u olentra-realtime -n 50`
- Verify MongoDB connection
- Verify OCI credentials/permissions

## 📊 Monitoring

After deployment, monitor these metrics:

1. **Upload success rate**: Check logs for "Upload worker failed"
2. **Processing time**: Worker runs every 2 seconds
3. **Storage usage**: Monitor OCI bucket sizes
4. **Error rates**: Check for FILE_INVALID or FILE_MALWARE errors

## 🚀 Rollback Plan

If issues occur:

```bash
ssh -i /Users/manidinuu/ORC-DS.key ubuntu@140.245.210.172
cd /home/ubuntu/olentra-website/backend/realtime-server
# Edit .env and change: INTERNSHIP_FILE_STORAGE=gridfs
sudo systemctl restart olentra-realtime
```

This will switch back to GridFS storage while keeping OCI files readable.
