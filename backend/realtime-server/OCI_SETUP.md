# OCI Production Setup for Direct File Uploads

This guide explains how to configure Oracle Cloud Infrastructure (OCI) for production-level direct file uploads with the Olentra internship backend.

## Architecture Overview

The production upload flow:
1. **Browser** → Bun HTTP endpoint: request upload permission
2. **Bun** → Browser: short-lived, object-specific upload URL (Pre-Authenticated Request)
3. **Browser** → Private OCI quarantine storage: upload directly over HTTPS
4. **Storage event** → Background worker: validate and scan file
5. **Worker** → Database: mark file ready or rejected
6. **Bun** → Browser via WebSocket: notify status

## OCI Prerequisites

### 1. Create OCI Buckets

You need two private buckets in the same compartment:

```bash
# Using OCI CLI (already authenticated)
oci os bucket create --compartment-id <compartment-ocid> \
  --name olentrainternship \
  --region ap-hyderabad-1

oci os bucket create --compartment-id <compartment-ocid> \
  --name olentrainternship-quarantine \
  --region ap-hyderabad-1
```

**Important**: Both buckets must be **private** (NoPublicAccess). The system validates this on startup.

### 2. Configure Instance Principals (Production)

When deploying on OCI Compute, the backend will automatically use instance principals authentication. No credentials need to be stored.

**Required IAM Policy** (create in your compartment):

```text
Allow service objectstorage-<region> to read buckets in compartment <compartment-name>
Allow service objectstorage-<region> to manage objects in compartment <compartment-name> where all {target.bucket.name='olentrainternship'}
Allow service objectstorage-<region> to manage objects in compartment <compartment-name> where all {target.bucket.name='olentrainternship-quarantine'}
```

Replace `<region>` with your region (e.g., `ap-hyderabad-1`) and `<compartment-name>` with your compartment name.

### 3. Set Up Malware Scanning (Optional but Recommended)

For production, deploy ClamAV as a private service:

**Option A: OCI Container Instance (Simplest)**
```bash
# Deploy ClamAV on OCI Container Instance
oci container-instances container-instance create \
  --compartment-id <compartment-ocid> \
  --name clamav-scanner \
  --shape shape-name \
  --container-config file://clamav-config.json
```

**Option B: OCI Compute Instance**
```bash
# On a compute instance:
sudo apt update && sudo apt install clamav clamav-daemon -y
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

**ClamAV configuration for networking:**
- Deploy in a private subnet
- Use VCN security rules to allow traffic only from your backend instances
- Default port: 3310

## Environment Variables

Set these in your production environment (e.g., OCI Compute instance metadata, Kubernetes ConfigMap, or .env file):

```bash
# Enable OCI direct uploads
INTERNSHIP_FILE_STORAGE=oci

# OCI Object Storage
OCI_STORAGE_NAMESPACE=axoi3mp9fcx5  # Get from: oci os ns get
OCI_STORAGE_REGION=ap-hyderabad-1
OCI_STORAGE_BUCKET=olentrainternship
OCI_QUARANTINE_BUCKET=olentrainternship-quarantine

# ClamAV (required in production if INTERNSHIP_FILE_STORAGE=oci)
CLAMAV_HOST=clamav  # Private IP or hostname of ClamAV service
CLAMAV_PORT=3310

# DO NOT set these in production (instance principals are automatic):
# OCI_AUTH_MODE=session
# OCI_CLI_PROFILE=OLENTRA
```

## Deployment Steps

### 1. Get Your Namespace

```bash
oci os ns get
# Output: "axoi3mp9fcx5"
```

### 2. Verify Bucket Privacy

```bash
oci os bucket get --bucket-name olentrainternship --region ap-hyderabad-1
# Check: publicAccessType should be "NoPublicAccess"
```

### 3. Create IAM Policy for Instance Principals

In OCI Console:
1. Go to Identity & Security → Policies
2. Create policy in your compartment
3. Add the statements from section 2 above

### 4. Deploy Backend with Environment Variables

Example for OCI Compute:

```bash
# Create compute instance with custom metadata
oci compute instance launch \
  --compartment-id <compartment-ocid> \
  --shape VM.Standard.E4.Flex \
  --image-id <image-ocid> \
  --subnet-id <subnet-ocid> \
  --metadata '{
    "INTERNSHIP_FILE_STORAGE": "oci",
    "OCI_STORAGE_NAMESPACE": "axoi3mp9fcx5",
    "OCI_STORAGE_REGION": "ap-hyderabad-1",
    "OCI_STORAGE_BUCKET": "olentrainternship",
    "OCI_QUARANTINE_BUCKET": "olentrainternship-quarantine",
    "CLAMAV_HOST": "10.0.1.5",
    "CLAMAV_PORT": "3310"
  }'
```

## Testing the Setup

### 1. Test OCI Connection

```bash
cd backend/realtime-server
bun run storage:smoke
```

### 2. Test Upload Flow

The backend exposes these endpoints:

- `POST /intern/files/uploads` - Initialize upload (returns pre-authenticated URL)
- `GET /intern/files/uploads/:id` - Check upload status
- `POST /intern/files/uploads/:id/complete` - Signal upload complete, trigger processing
- `GET /intern/files/:id` - Download validated file

### 3. Monitor Processing

The background worker runs every 2 seconds (configurable) to process pending uploads. Check logs for:

```
Upload worker failed
Upload cleanup failed
```

## Security Considerations

### ✅ Production Safeguards (Already Implemented)

1. **Quarantine Pattern**: Files are not accessible until validated
2. **Pre-Authenticated URLs**: Short-lived (5 minutes), object-specific
3. **Size Limits**: 5MB for resumes, 10MB for work files
4. **Signature Validation**: Magic bytes verify actual file type
5. **Lease-Based Processing**: Prevents duplicate processing
6. **Private Buckets**: No public access to storage
7. **Instance Principals**: No static credentials to leak

### 🔒 Additional Recommendations

1. **Network Security**: Use VCN security lists to restrict traffic
2. **Monitoring**: Enable OCI Object Storage logging
3. **Encryption**: OCI encrypts data at rest by default
4. **Backup**: Enable cross-region replication for critical data
5. **Cost Management**: Set budget alerts on Object Storage

## Rollback Plan

If you need to disable direct uploads:

```bash
# Change environment variable
INTERNSHIP_FILE_STORAGE=gridfs

# Restart backend
# Existing OCI files remain readable; new uploads go to GridFS
```

## Troubleshooting

### "Production uploads require instance principals"
- Ensure you're not setting `OCI_AUTH_MODE=session` in production
- Verify the instance has the IAM policy from section 2

### "OCI upload buckets must be private"
- Check bucket public access type in OCI Console
- Ensure both buckets have `NoPublicAccess`

### "Configure a private CLAMAV_HOST and valid port"
- Set `CLAMAV_HOST` and `CLAMAV_PORT` in production
- Or deploy ClamAV service (see section 3)

### Pre-authenticated URL fails
- Verify instance can reach OCI Object Storage endpoints
- Check VCN route tables and security lists
- Ensure IAM policy allows object management

## Cost Estimates

**OCI Object Storage (ap-hyderabad-1)**:
- Storage: ~$0.0255/GB/month
- Requests: First 10TB/month free
- Egress: First 10TB/month free within region

**ClamAV**:
- Compute: ~$0.048/OCPU/hour (smallest instance)
- Storage: Minimal (~10GB)

For 1000 intern resumes (~5MB each):
- Storage: ~$0.13/month
- Egress: Included in free tier
- Total: < $1/month
