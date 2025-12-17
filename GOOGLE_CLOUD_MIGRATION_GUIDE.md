# Google Cloud Platform Migration Guide
## Art Director Studio - Complete GCP Ecosystem Migration

This guide provides a comprehensive, step-by-step approach to hosting your Art Director Studio platform entirely on Google Cloud Platform (GCP), replacing Supabase with native Google services.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Service Mapping](#service-mapping)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Cost Optimization](#cost-optimization)
6. [Monitoring & Operations](#monitoring--operations)

---

## Architecture Overview

### Current Stack (Supabase-based)
- **Frontend**: Vite + React + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Hosting**: (Current hosting platform)

### Target Stack (Google Cloud)
- **Frontend Hosting**: Firebase Hosting or Cloud Run
- **Database**: Cloud SQL (PostgreSQL) or Firestore
- **Auth**: Firebase Authentication
- **Storage**: Cloud Storage
- **Backend/API**: Cloud Functions or Cloud Run
- **AI Services**: Vertex AI, Gemini API
- **CDN**: Cloud CDN
- **Monitoring**: Cloud Monitoring & Cloud Logging
- **CI/CD**: Cloud Build

---

## Prerequisites

### 1. Google Cloud Account Setup
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize gcloud
gcloud init

# Create a new project
gcloud projects create artdirector-studio --name="Art Director Studio"

# Set the project
gcloud config set project artdirector-studio

# Enable billing (required for most services)
# Visit: https://console.cloud.google.com/billing
```

### 2. Enable Required APIs
```bash
# Enable all necessary Google Cloud APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudresourcemanager.googleapis.com \
  firebase.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  aiplatform.googleapis.com \
  compute.googleapis.com \
  cloudfunctions.googleapis.com \
  secretmanager.googleapis.com
```

### 3. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

---

## Service Mapping

| Supabase Service | Google Cloud Equivalent | Notes |
|-----------------|------------------------|-------|
| Supabase Database | Cloud SQL (PostgreSQL) or Firestore | Cloud SQL for relational, Firestore for NoSQL |
| Supabase Auth | Firebase Authentication | Drop-in replacement with similar features |
| Supabase Storage | Cloud Storage | Object storage with CDN integration |
| Supabase Edge Functions | Cloud Functions or Cloud Run | Serverless compute |
| Supabase Realtime | Firestore Real-time listeners | Real-time data sync |
| Supabase Dashboard | Cloud Console + Firebase Console | Management interfaces |

---

## Step-by-Step Migration

### Phase 1: Database Migration

#### Option A: Cloud SQL (PostgreSQL) - Recommended for Supabase Migration
```bash
# 1. Create Cloud SQL instance
gcloud sql instances create artdirector-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=03:00

# 2. Set root password
gcloud sql users set-password postgres \
  --instance=artdirector-db \
  --password=YOUR_SECURE_PASSWORD

# 3. Create application database
gcloud sql databases create artdirector_production \
  --instance=artdirector-db

# 4. Export data from Supabase
# In Supabase Dashboard: Settings > Database > Export
# Or use pg_dump:
pg_dump -h db.vsbjxktlrbfxfhxiqzlr.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase_backup.sql

# 5. Import to Cloud SQL
gcloud sql import sql artdirector-db \
  gs://YOUR_BUCKET/supabase_backup.sql \
  --database=artdirector_production
```

#### Option B: Firestore (NoSQL) - Better for Scalability
```bash
# 1. Initialize Firestore
firebase init firestore

# 2. Create Firestore database
gcloud firestore databases create \
  --location=us-central \
  --type=firestore-native

# 3. Migrate data using custom script (see migration script below)
```

### Phase 2: Authentication Migration

```bash
# 1. Initialize Firebase in your project
firebase init

# Select:
# - Authentication
# - Hosting
# - Storage
# - Functions (if needed)

# 2. Enable authentication methods
# Visit Firebase Console > Authentication > Sign-in method
# Enable: Email/Password, Google, etc.

# 3. Export users from Supabase
# Supabase Dashboard > Authentication > Users > Export

# 4. Import users to Firebase
firebase auth:import supabase_users.json --hash-algo=bcrypt
```

### Phase 3: Storage Migration

```bash
# 1. Create Cloud Storage bucket
gcloud storage buckets create gs://artdirector-assets \
  --location=us-central1 \
  --uniform-bucket-level-access

# 2. Set up CORS for web access
cat > cors.json << EOF
[
  {
    "origin": ["https://artdirectorstudio.com", "http://localhost:5173"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gcloud storage buckets update gs://artdirector-assets --cors-file=cors.json

# 3. Migrate files from Supabase Storage
# Use gsutil to sync:
# First, download from Supabase, then:
gcloud storage cp -r ./supabase_storage/* gs://artdirector-assets/

# 4. Set up Cloud CDN (optional but recommended)
gcloud compute backend-buckets create artdirector-cdn \
  --gcs-bucket-name=artdirector-assets \
  --enable-cdn
```

### Phase 4: Code Migration

#### 4.1 Update Dependencies
```bash
# Install Firebase SDK
npm install firebase
npm install @google-cloud/storage
npm install @google-cloud/firestore  # if using Firestore

# Remove Supabase
npm uninstall @supabase/supabase-js
```

#### 4.2 Update Environment Variables
Create new `.env` file:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=artdirector-studio.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=artdirector-studio
VITE_FIREBASE_STORAGE_BUCKET=artdirector-studio.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloud SQL (if using)
VITE_DB_HOST=/cloudsql/artdirector-studio:us-central1:artdirector-db
VITE_DB_NAME=artdirector_production
VITE_DB_USER=postgres

# Google Cloud Storage
VITE_GCS_BUCKET=artdirector-assets

# Vertex AI / Gemini
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key
VITE_VERTEX_AI_PROJECT=artdirector-studio
VITE_VERTEX_AI_LOCATION=us-central1
```

### Phase 5: Frontend Hosting

#### Option A: Firebase Hosting (Recommended for Static Sites)
```bash
# 1. Initialize Firebase Hosting
firebase init hosting

# 2. Update firebase.json
cat > firebase.json << EOF
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
EOF

# 3. Build and deploy
npm run build
firebase deploy --only hosting
```

#### Option B: Cloud Run (For Server-Side Rendering or Dynamic Content)
```bash
# 1. Create Dockerfile
cat > Dockerfile << EOF
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF

# 2. Create nginx.conf
cat > nginx.conf << EOF
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 3. Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/artdirector-studio/frontend
gcloud run deploy artdirector-frontend \
  --image gcr.io/artdirector-studio/frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi
```

### Phase 6: Backend/API Layer

#### Create Cloud Functions for Backend Logic
```bash
# 1. Initialize Cloud Functions
mkdir functions
cd functions
npm init -y
npm install @google-cloud/functions-framework

# 2. Create example function
cat > index.js << EOF
const functions = require('@google-cloud/functions-framework');
const {Firestore} = require('@google-cloud/firestore');

const firestore = new Firestore();

functions.http('processImage', async (req, res) => {
  // Your image processing logic
  res.json({success: true});
});
EOF

# 3. Deploy function
gcloud functions deploy processImage \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1
```

### Phase 7: AI Integration (Vertex AI & Gemini)

```bash
# 1. Enable Vertex AI
gcloud services enable aiplatform.googleapis.com

# 2. Set up Gemini API access
# Visit: https://makersuite.google.com/app/apikey
# Generate API key for Gemini

# 3. Update your AI integration code to use Vertex AI
```

### Phase 8: CI/CD with Cloud Build

```bash
# 1. Create cloudbuild.yaml
cat > cloudbuild.yaml << EOF
steps:
  # Install dependencies
  - name: 'node:18'
    entrypoint: npm
    args: ['ci']
  
  # Run tests
  - name: 'node:18'
    entrypoint: npm
    args: ['test']
  
  # Build application
  - name: 'node:18'
    entrypoint: npm
    args: ['run', 'build']
  
  # Deploy to Firebase Hosting
  - name: 'gcr.io/\$PROJECT_ID/firebase'
    args: ['deploy', '--only', 'hosting']

options:
  logging: CLOUD_LOGGING_ONLY
EOF

# 2. Create build trigger
gcloud builds triggers create github \
  --repo-name=artdirectorstudio \
  --repo-owner=justinlagos \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

### Phase 9: Domain & SSL Setup

```bash
# For Firebase Hosting:
firebase hosting:channel:deploy production
firebase hosting:sites:create artdirectorstudio
firebase hosting:sites:domain:add artdirectorstudio artdirectorstudio.com

# For Cloud Run:
gcloud beta run domain-mappings create \
  --service artdirector-frontend \
  --domain artdirectorstudio.com \
  --region us-central1
```

---

## Code Migration Examples

### 1. Replace Supabase Client with Firebase

**Before (Supabase):**
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
```

**After (Firebase):**
```typescript
// src/integrations/firebase/client.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### 2. Update Authentication

**Before (Supabase):**
```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// Sign up
const { data, error } = await supabase.auth.signUp({
  email,
  password
});

// Get user
const { data: { user } } = await supabase.auth.getUser();
```

**After (Firebase):**
```typescript
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Sign in
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

// Sign up
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

// Get user
const user = auth.currentUser;
```

### 3. Update Database Queries

**Before (Supabase):**
```typescript
// Fetch data
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId);

// Insert data
const { data, error } = await supabase
  .from('projects')
  .insert({ name: 'New Project', user_id: userId });
```

**After (Firestore):**
```typescript
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

// Fetch data
const q = query(
  collection(db, 'projects'),
  where('userId', '==', userId)
);
const querySnapshot = await getDocs(q);
const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// Insert data
const docRef = await addDoc(collection(db, 'projects'), {
  name: 'New Project',
  userId: userId,
  createdAt: new Date()
});
```

### 4. Update Storage

**Before (Supabase):**
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('assets')
  .upload(`${userId}/${fileName}`, file);

// Get public URL
const { data } = supabase.storage
  .from('assets')
  .getPublicUrl(`${userId}/${fileName}`);
```

**After (Cloud Storage via Firebase):**
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Upload file
const storageRef = ref(storage, `assets/${userId}/${fileName}`);
await uploadBytes(storageRef, file);

// Get public URL
const url = await getDownloadURL(storageRef);
```

---

## Cost Optimization

### 1. Use Free Tiers Effectively
- **Firebase Hosting**: 10GB storage, 360MB/day transfer (free)
- **Cloud Functions**: 2M invocations/month (free)
- **Firestore**: 50K reads, 20K writes, 20K deletes/day (free)
- **Cloud Storage**: 5GB storage, 1GB egress/month (free)
- **Cloud Build**: 120 build-minutes/day (free)

### 2. Cost-Saving Strategies
```bash
# Use Cloud Storage lifecycle policies
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://artdirector-assets --lifecycle-file=lifecycle.json

# Use committed use discounts for Cloud SQL
gcloud sql instances patch artdirector-db \
  --pricing-plan=PACKAGE

# Enable Cloud CDN for reduced egress costs
gcloud compute backend-buckets update artdirector-cdn --enable-cdn
```

### 3. Monitoring Costs
```bash
# Set up budget alerts
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Art Director Studio Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

---

## Monitoring & Operations

### 1. Set Up Cloud Monitoring
```bash
# Create uptime check
gcloud monitoring uptime-checks create https://artdirectorstudio.com \
  --display-name="Art Director Studio Uptime" \
  --check-interval=60s

# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

### 2. Set Up Logging
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Create log-based metrics
gcloud logging metrics create error_count \
  --description="Count of error logs" \
  --log-filter='severity>=ERROR'
```

### 3. Performance Monitoring
```typescript
// Add Firebase Performance Monitoring
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
```

---

## Migration Checklist

- [ ] Set up Google Cloud Project
- [ ] Enable all required APIs
- [ ] Export data from Supabase
- [ ] Create Cloud SQL or Firestore database
- [ ] Import data to new database
- [ ] Set up Firebase Authentication
- [ ] Migrate user accounts
- [ ] Create Cloud Storage buckets
- [ ] Migrate files from Supabase Storage
- [ ] Update application code
- [ ] Update environment variables
- [ ] Test authentication flow
- [ ] Test database operations
- [ ] Test file uploads/downloads
- [ ] Set up Firebase Hosting or Cloud Run
- [ ] Configure custom domain
- [ ] Set up SSL certificates
- [ ] Configure CI/CD pipeline
- [ ] Set up monitoring and alerts
- [ ] Set up cost budgets
- [ ] Perform load testing
- [ ] Update DNS records
- [ ] Monitor migration for 48 hours
- [ ] Decommission Supabase (after verification)

---

## Support Resources

- **Google Cloud Documentation**: https://cloud.google.com/docs
- **Firebase Documentation**: https://firebase.google.com/docs
- **Vertex AI Documentation**: https://cloud.google.com/vertex-ai/docs
- **Cloud SQL Migration**: https://cloud.google.com/sql/docs/postgres/migrate-data
- **Firebase Migration Guide**: https://firebase.google.com/docs/projects/migrate

---

## Estimated Timeline

- **Planning & Setup**: 1-2 days
- **Database Migration**: 2-3 days
- **Code Migration**: 3-5 days
- **Testing**: 2-3 days
- **Deployment**: 1 day
- **Monitoring & Optimization**: Ongoing

**Total**: 2-3 weeks for complete migration

---

## Next Steps

1. Review this guide and identify which services best fit your needs
2. Set up a Google Cloud project and enable billing
3. Start with a small proof-of-concept (e.g., migrate auth first)
4. Gradually migrate services one at a time
5. Run both systems in parallel during transition
6. Monitor closely and optimize costs

Good luck with your migration! 🚀
