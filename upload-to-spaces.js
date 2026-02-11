#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const config = {
  endpoint: 'https://nyc3.digitaloceanspaces.com', // Change to your region: nyc3, sfo3, sgp1, fra1, ams3
  region: 'nyc3', // Change to your region
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || 'YOUR_ACCESS_KEY_HERE',
    secretAccessKey: process.env.DO_SPACES_SECRET || 'YOUR_SECRET_KEY_HERE'
  }
};

const SPACE_NAME = process.env.DO_SPACE_NAME || 'YOUR_SPACE_NAME_HERE';
const PREFIX = 'artdirectorstudio/'; // Folder name in your Space
const LOCAL_PATH = './'; // Current directory

// ============================================
// EXCLUDE PATTERNS
// ============================================
const excludePatterns = [
  /node_modules/,
  /\.git/,
  /dist/,
  /test-results/,
  /playwright-report/,
  /\.DS_Store/,
  /upload-to-spaces\.js/,
  /\.env$/,
  /\.env\./
];

const s3Client = new S3Client(config);

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

  let lastProgress = 0;
  upload.on('httpUploadProgress', (progress) => {
    if (progress.total) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      if (percent !== lastProgress && percent % 10 === 0) {
        console.log(`  ${percent}% - ${s3Key}`);
        lastProgress = percent;
      }
    }
  });

  await upload.done();
  console.log(`✓ Uploaded: ${s3Key} (${(stats.size / 1024).toFixed(2)} KB)`);
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
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   DigitalOcean Spaces Upload Script                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Validate configuration
  if (config.credentials.accessKeyId.includes('YOUR_') ||
      config.credentials.secretAccessKey.includes('YOUR_') ||
      SPACE_NAME.includes('YOUR_')) {
    console.error('❌ Error: Please update the configuration values in the script or set environment variables:');
    console.error('   - DO_SPACES_KEY (Access Key)');
    console.error('   - DO_SPACES_SECRET (Secret Key)');
    console.error('   - DO_SPACE_NAME (Space Name)\n');
    console.error('Or edit the script and replace YOUR_ACCESS_KEY_HERE, YOUR_SECRET_KEY_HERE, and YOUR_SPACE_NAME_HERE\n');
    process.exit(1);
  }

  console.log(`Space: ${SPACE_NAME}`);
  console.log(`Region: ${config.region}`);
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Local path: ${path.resolve(LOCAL_PATH)}`);
  console.log('─'.repeat(60) + '\n');

  try {
    await uploadDirectory(LOCAL_PATH, PREFIX);
    console.log('\n' + '═'.repeat(60));
    console.log('✓ Upload complete!');
    console.log(`\nYour files are now available at:`);
    console.log(`https://${SPACE_NAME}.${config.region}.digitaloceanspaces.com/${PREFIX}`);
    console.log(`\nCDN URL (if enabled):`);
    console.log(`https://${SPACE_NAME}.${config.region}.cdn.digitaloceanspaces.com/${PREFIX}`);
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('\n❌ Error uploading:', error.message);
    if (error.Code === 'InvalidAccessKeyId') {
      console.error('→ Check your access key');
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('→ Check your secret key');
    } else if (error.Code === 'NoSuchBucket') {
      console.error('→ Check your space name and region');
    }
    process.exit(1);
  }
}

main();
