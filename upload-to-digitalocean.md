# Upload Art Director Studio to DigitalOcean Spaces

## Option 1: Using s3cmd (Recommended)

### Install s3cmd
```bash
# macOS
brew install s3cmd

# Ubuntu/Debian
sudo apt-get install s3cmd

# Using pip
pip install s3cmd
```

### Configure s3cmd
```bash
s3cmd --configure
```

When prompted, enter:
- **Access Key**: Your DigitalOcean Spaces access key
- **Secret Key**: Your DigitalOcean Spaces secret key
- **Default Region**: Your Space's region (e.g., `nyc3`, `sfo3`, `sgp1`, `fra1`, `ams3`)
- **S3 Endpoint**: `${REGION}.digitaloceanspaces.com` (replace ${REGION} with your region)
- **DNS-style bucket+hostname:port template**: `%(bucket)s.${REGION}.digitaloceanspaces.com`

### Upload Your Project
```bash
cd /path/to/artdirectorstudio

# Upload entire folder (excluding node_modules for efficiency)
s3cmd sync . s3://YOUR-SPACE-NAME/artdirectorstudio/ \
  --exclude 'node_modules/*' \
  --exclude '.git/*' \
  --exclude 'dist/*' \
  --exclude 'test-results/*' \
  --exclude 'playwright-report/*' \
  --exclude '.DS_Store' \
  --acl-public

# Or upload everything including node_modules (slower, larger)
s3cmd sync . s3://YOUR-SPACE-NAME/artdirectorstudio/ --acl-public
```

---

## Option 2: Using DigitalOcean CLI (doctl)

### Install doctl
```bash
# macOS
brew install doctl

# Linux - download from https://github.com/digitalocean/doctl/releases
```

### Authenticate
```bash
doctl auth init
```

### Upload Files
```bash
# Note: doctl doesn't have native Spaces upload, use s3cmd or aws-cli instead
```

---

## Option 3: Using AWS CLI (S3-compatible)

### Install AWS CLI
```bash
# macOS
brew install awscli

# Ubuntu/Debian
sudo apt-get install awscli

# Using pip
pip install awscli
```

### Configure AWS CLI for DigitalOcean Spaces
Create/edit `~/.aws/config`:
```ini
[profile digitalocean]
region = nyc3
output = json
```

Create/edit `~/.aws/credentials`:
```ini
[digitalocean]
aws_access_key_id = YOUR_DIGITALOCEAN_ACCESS_KEY
aws_secret_access_key = YOUR_DIGITALOCEAN_SECRET_KEY
```

### Upload Your Project
```bash
cd /path/to/artdirectorstudio

# Upload entire folder
aws s3 sync . s3://YOUR-SPACE-NAME/artdirectorstudio/ \
  --endpoint-url=https://nyc3.digitaloceanspaces.com \
  --profile digitalocean \
  --exclude "node_modules/*" \
  --exclude ".git/*" \
  --acl public-read

# Or include everything
aws s3 sync . s3://YOUR-SPACE-NAME/artdirectorstudio/ \
  --endpoint-url=https://nyc3.digitaloceanspaces.com \
  --profile digitalocean \
  --acl public-read
```

---

## Option 4: Using Node.js Script

Save this as `upload-to-spaces.js` in your project root:

```javascript
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// Configuration
const config = {
  endpoint: 'https://nyc3.digitaloceanspaces.com', // Change to your region
  region: 'nyc3', // Change to your region
  credentials: {
    accessKeyId: 'YOUR_ACCESS_KEY',
    secretAccessKey: 'YOUR_SECRET_KEY'
  }
};

const SPACE_NAME = 'YOUR_SPACE_NAME';
const PREFIX = 'artdirectorstudio/';
const LOCAL_PATH = './';

const s3Client = new S3Client(config);

// Directories/files to exclude
const excludePatterns = [
  /node_modules/,
  /\.git/,
  /dist/,
  /test-results/,
  /playwright-report/,
  /\.DS_Store/,
  /upload-to-spaces\.js/
];

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => pattern.test(filePath));
}

async function uploadFile(localPath, s3Key) {
  const fileStream = fs.createReadStream(localPath);
  const stats = fs.statSync(localPath);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: SPACE_NAME,
      Key: s3Key,
      Body: fileStream,
      ACL: 'public-read',
      ContentLength: stats.size
    }
  });

  upload.on('httpUploadProgress', (progress) => {
    console.log(`Uploading ${s3Key}: ${Math.round((progress.loaded / progress.total) * 100)}%`);
  });

  await upload.done();
  console.log(`✓ Uploaded: ${s3Key}`);
}

async function uploadDirectory(dirPath, s3Prefix) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const localPath = path.join(dirPath, file);
    const relativePath = path.relative(LOCAL_PATH, localPath);
    const s3Key = s3Prefix + relativePath.replace(/\\/g, '/');

    if (shouldExclude(relativePath)) {
      console.log(`⊘ Skipping: ${relativePath}`);
      continue;
    }

    const stat = fs.statSync(localPath);

    if (stat.isDirectory()) {
      await uploadDirectory(localPath, s3Prefix);
    } else {
      await uploadFile(localPath, s3Key);
    }
  }
}

async function main() {
  console.log('Starting upload to DigitalOcean Spaces...');
  console.log(`Space: ${SPACE_NAME}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Local path: ${LOCAL_PATH}`);
  console.log('---');

  try {
    await uploadDirectory(LOCAL_PATH, PREFIX);
    console.log('\n✓ Upload complete!');
  } catch (error) {
    console.error('Error uploading:', error);
    process.exit(1);
  }
}

main();
```

Install dependencies and run:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
node upload-to-spaces.js
```

---

## Important Notes for OpenClaw

1. **Access Permissions**: Make sure your Space is configured with the correct CORS settings if OpenClaw needs to access files via browser.

2. **CDN URL**: After upload, your files will be accessible at:
   - Direct: `https://YOUR-SPACE-NAME.nyc3.digitaloceanspaces.com/artdirectorstudio/`
   - CDN (if enabled): `https://YOUR-SPACE-NAME.nyc3.cdn.digitaloceanspaces.com/artdirectorstudio/`

3. **Environment Variables**: Update OpenClaw's configuration to point to your Spaces URL.

4. **File Permissions**: All files are uploaded with `public-read` ACL for OpenClaw to access them.

---

## Quick Commands Summary

**Fastest method (s3cmd):**
```bash
s3cmd sync . s3://YOUR-SPACE/artdirectorstudio/ --exclude 'node_modules/*' --exclude '.git/*'
```

**Using AWS CLI:**
```bash
aws s3 sync . s3://YOUR-SPACE/artdirectorstudio/ \
  --endpoint-url=https://REGION.digitaloceanspaces.com \
  --profile digitalocean \
  --exclude "node_modules/*"
```

Replace:
- `YOUR-SPACE`: Your DigitalOcean Space name
- `REGION`: Your Space's region (nyc3, sfo3, etc.)
- `YOUR_ACCESS_KEY` and `YOUR_SECRET_KEY`: Your Spaces API credentials
