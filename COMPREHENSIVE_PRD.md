# Art Director Studio - Comprehensive Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** December 2024  
**Purpose:** Complete technical and functional specification for development team to transform Art Director Studio into a god-tier design platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Core Features - Complete Inventory](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema](#database-schema)
6. [API & Edge Functions](#api--edge-functions)
7. [Frontend Architecture](#frontend-architecture)
8. [User Flows & Workflows](#user-flows--workflows)
9. [Subscription & Billing System](#subscription--billing-system)
10. [Admin & Management Features](#admin--management-features)
11. [Performance & Optimization](#performance--optimization)
12. [Security & Compliance](#security--compliance)
13. [Analytics & Monitoring](#analytics--monitoring)
14. [Intelligence Framework](#intelligence-framework)
15. [Mobile & Responsive Design](#mobile--responsive-design)
16. [Future Enhancement Roadmap](#future-enhancement-roadmap)

---

## Executive Summary

**Art Director Studio** is an AI-powered creative agency workspace that combines creative strategy, production tools, and intelligent assistance into a unified platform. The platform serves designers, art directors, and creative professionals who need to ideate campaigns, generate visual directions, organize assets, collaborate with clients, and track performance.

### Current State
- **Technology Stack:** React 18 + TypeScript, Vite, Supabase, TanStack Query, shadcn/ui, Tailwind CSS
- **AI Models:** Google Gemini 3 Pro Image (Nano Banana Pro), Gemini 2.5 Flash Image, Gemini 2.5 Pro
- **Infrastructure:** Supabase (PostgreSQL, Edge Functions, Storage), Stripe (billing)
- **Deployment:** Vercel (frontend), Supabase (backend)

### Key Metrics
- **4 Core Tools:** Analyze, Blend, Upscale, Batch
- **31 Edge Functions:** Backend processing and integrations
- **45 Database Migrations:** Complete schema evolution
- **165+ Components:** Comprehensive UI library
- **4 Subscription Tiers:** Free, Starter, Pro, Enterprise

---

## Product Vision

Art Director Studio aims to be the **complete creative operating system** for designers, reducing ideation time by 70-90% and providing professional-grade tools that rival traditional design software, enhanced with AI intelligence.

### Core Value Propositions
1. **AI Creative Copilot (Artie):** Senior art director-level intelligence that guides creative decisions
2. **Unified Workflow:** From brief to final deliverable in one platform
3. **Professional Quality:** 4K image generation, advanced editing, production-ready outputs
4. **Intelligent Context:** System remembers user preferences, project context, and creative direction
5. **Collaboration Ready:** Shareable assets, client presentations, community features

---

## Core Features - Complete Inventory

### 1. Studio (Image Generation)

**Location:** `src/pages/Index.tsx`, `src/components/ImageGenerationDialog.tsx`

**Capabilities:**
- **Prompt-Based Generation:** Text-to-image with advanced prompt editor
- **Reference Image Support:** Generate variations from existing images
- **Continuation Strength Control:** Adjust how closely generated images match reference (0-100%)
- **Multiple Aspect Ratios:** Square (1:1), Portrait (4:5), Landscape (16:9), Wide (21:9), Custom
- **Quality Settings:** High, Medium, Low, Auto
- **Size Options:** 1K, 2K, 4K resolution support
- **Prompt Enhancement:** Auto-enhance, simplify, or artistic style buttons
- **Advanced Options:**
  - Negative prompts
  - Seed control
  - Style presets
  - Temperature control

**Technical Details:**
- **Edge Function:** `supabase/functions/generate-image/index.ts`
- **AI Model:** `google/gemini-3-pro-image-preview` (Nano Banana Pro)
- **Storage:** Results saved to `generated-images` bucket
- **Database:** Saved to `generated_assets` table with metadata

**User Flow:**
1. User enters prompt or uploads reference image
2. Adjusts settings (ratio, quality, continuation strength)
3. Clicks "Generate"
4. Image appears in preview
5. Can save to "My Projects" or generate variations

---

### 2. Image Analysis

**Location:** `src/components/AnalysisLayout.tsx`, `src/components/AnalysisOverview.tsx`

**Capabilities:**
- **12 Professional Analysis Categories:**
  1. Image Overview
  2. Subject Description
  3. Camera & Composition
  4. Lighting
  5. Color Palette
  6. Design Style
  7. Texture & Material
  8. Mood & Emotion
  9. Background & Environment
  10. Artistic Medium
  11. Art Direction Influence
  12. Intended Use

- **Auto-Generated Prompts:** System creates production-ready regeneration prompts
- **Progressive Feedback:** Real-time analysis updates as AI processes
- **Guided Tweaks:** Interactive controls to adjust analysis parameters
- **Live Prompt Evolution:** See prompt update as you adjust settings

**Technical Details:**
- **Edge Function:** `supabase/functions/analyze-image/index.ts`
- **AI Model:** `google/gemini-2.5-pro` (text analysis)
- **Analysis Storage:** Saved in `generated_assets.analysis_data` (JSONB)
- **Caching:** 24-hour cache for repeated analysis of same image

**User Flow:**
1. Upload image to Studio
2. Click "Analyze"
3. View progressive analysis feedback
4. Review 12-category breakdown
5. Edit prompt or adjust guided tweaks
6. Generate variations from analysis

---

### 3. Image Editing

**Location:** `src/components/ImageEditor.tsx`, `src/components/edit-image/EditImageModal.tsx`

**Capabilities:**
- **Basic Adjustments:**
  - Brightness, Contrast, Saturation
  - Hue, Warmth, Exposure
  - Shadows, Highlights, Clarity, Sharpness, Vibrance

- **Advanced Editing:**
  - Object replacement
  - Blemish removal
  - Background smoothing
  - Region-specific editing (mask-based)

- **Instruction-Based Editing:** Natural language instructions for AI-powered edits
- **Before/After Comparison:** Slider view to compare original vs edited
- **Quality Preservation:** Maintains image quality during edits

**Technical Details:**
- **Edge Function:** `supabase/functions/edit-image/index.ts`
- **AI Model:** `google/gemini-2.5-flash-image-preview`
- **Instruction Generation:** Auto-generates detailed instructions from slider adjustments
- **Region Selection:** Supports mask-based region editing (UI ready, backend needs enhancement)

**User Flow:**
1. Open image in Edit tool
2. Adjust sliders or enter instruction
3. Preview changes
4. Apply edit
5. Save edited version

---

### 4. Image Blending

**Location:** `src/components/ImageBlendDialog.tsx`

**Capabilities:**
- **Multi-Image Blending:** Combine 2-4 images seamlessly
- **Instruction-Based Blending:** Natural language instructions guide blend style
- **Blend Modes:** Various blending algorithms
- **Ratio Control:** Adjust blend intensity
- **Real-Time Preview:** See blend result before finalizing

**Technical Details:**
- **Edge Function:** `supabase/functions/blend-images/index.ts`
- **AI Model:** `google/gemini-2.5-flash-image-preview`
- **Validation:** 2-4 images required, max 15MB each
- **Idempotency:** Prevents duplicate blend requests

**User Flow:**
1. Upload 2-4 images
2. Enter blend instruction
3. Click "Blend"
4. View result
5. Save or generate variations

---

### 5. Image Upscaling

**Location:** `src/components/ImageUpscaleDialog.tsx`

**Capabilities:**
- **Resolution Enhancement:** Upscale to 1536×1536 or 2048×2048
- **Quality Preservation:** Maintains detail and sharpness
- **Before/After Slider:** Compare original vs upscaled
- **Batch Upscaling:** Process multiple images (via Batch tool)

**Technical Details:**
- **Edge Function:** `supabase/functions/upscale-image/index.ts`
- **AI Model:** `google/gemini-2.5-flash-image-preview`
- **Target Sizes:** 1536×1536, 2048×2048
- **4K Support:** Native 4K output via Gemini 3 Pro

**User Flow:**
1. Upload image
2. Select target size
3. Click "Upscale"
4. View before/after comparison
5. Download or save

---

### 6. Batch Processing

**Location:** `src/components/BatchProcessDialog.tsx` (temporarily disabled)

**Capabilities:**
- **Batch Analyze:** Analyze 1-10 images sequentially
- **Batch Upscale:** Upscale 1-10 images sequentially
- **Per-Item Status:** Track progress for each image
- **Pause/Resume:** Control batch processing
- **Download All:** Bulk download results

**Technical Details:**
- **Processing:** Sequential processing with 500ms delay between items
- **Access Control:** Each item checks feature access individually
- **Status Tracking:** Per-item status (pending, processing, completed, failed)
- **Error Handling:** Failed items don't stop batch

**User Flow:**
1. Upload 1-10 images
2. Select operation (Analyze All or Upscale All)
3. Click "Start Batch"
4. Monitor per-item progress
5. View all results or download

---

### 7. Artie - AI Creative Copilot

**Location:** `src/pages/ArtiePage.tsx`, `src/hooks/useArtieCore.ts`

**Capabilities:**
- **Conversational Interface:** Chat-based creative assistance
- **Context Memory:** Remembers images, briefs, and conversation history
- **File Upload Support:** Images, PDFs, DOCX documents
- **Brief Processing:** Extracts key insights from creative briefs
- **Tool Integration:** Can trigger Studio, Edit, Blend, Upscale tools
- **Image Understanding:** Analyzes uploaded images for context
- **Creative Direction:** Provides art director-level feedback and suggestions
- **Workflow Guidance:** Suggests next steps in creative process

**Technical Details:**
- **Edge Function:** `supabase/functions/artie-chat/index.ts`
- **AI Model:** `google/gemini-2.5-pro` (conversation), `google/gemini-2.5-flash-image-preview` (image understanding)
- **Context Storage:** 
  - `artie_conversations` table (persistent conversations)
  - `artie_messages` table (message history)
  - `artie_context_memory` table (images, briefs, preferences)
- **Document Parsing:** Extracts text from PDFs and DOCX files
- **Image Memory:** Stores image references for context

**User Flow:**
1. Open Artie chat
2. Ask question or upload file
3. Artie analyzes and responds
4. Follow suggestions or use tool integrations
5. Continue conversation with context

**System Prompt:** See `src/lib/artieSystemPrompt.ts` for complete personality and behavior specification.

---

### 8. My Projects (History)

**Location:** `src/components/GeneratedImagesGallery.tsx` (integrated in Dashboard)

**Capabilities:**
- **Asset Management:** View all generated, edited, blended, upscaled images
- **Search & Filter:** Search by prompt, filter by type, date, action
- **Share Functionality:** Generate shareable links with tokens
- **Batch Operations:** Select multiple assets for batch actions
- **Metadata View:** See prompts, analysis data, source images
- **Download:** Individual or bulk download
- **Delete:** Remove assets from history

**Technical Details:**
- **Database Table:** `generated_assets`
- **Storage:** Images in `generated-images` bucket
- **Thumbnails:** 1024px thumbnails for fast loading
- **Share Links:** Token-based sharing via `share_slug` field

**User Flow:**
1. Navigate to Dashboard or History
2. Browse generated assets
3. Click asset to view details
4. Share, download, or delete

---

### 9. Community (Inspire)

**Location:** `src/pages/Community.tsx`

**Capabilities:**
- **Public Gallery:** Browse community-generated images
- **Posting:** Share images to community feed
- **Likes & Comments:** Social engagement features
- **Sorting Options:**
  - Trending (by likes/comments)
  - Recent (by date)
  - Most Discussed (by comments)
- **Infinite Scroll:** Paginated feed loading
- **User Profiles:** View creator information

**Technical Details:**
- **Database Tables:**
  - `community_posts` (images, captions, metadata)
  - `community_comments` (comment threads)
  - `community_likes` (like tracking)
- **RLS Policies:** Public read, authenticated write
- **Counters:** Triggers maintain like/comment counts
- **Indexes:** Optimized for feed performance

**User Flow:**
1. Navigate to Community
2. Browse feed or post own image
3. Like or comment on posts
4. View creator profiles

---

### 10. Preset Gallery

**Location:** `src/pages/PresetGallery.tsx` (temporarily disabled)

**Capabilities:**
- **Preset Browsing:** Browse curated prompt presets
- **Featured Presets:** Highlighted presets carousel
- **Custom Presets:** User-created presets (future)
- **Preset Application:** One-click apply to Studio

**Status:** Currently shows placeholder message. Full implementation planned.

---

### 11. Insights (Brief Analysis)

**Location:** `src/pages/Insights.tsx`

**Capabilities:**
- **Brief Upload:** Upload PDF or DOCX creative briefs
- **AI Analysis:** Extracts key insights from briefs:
  - Objective
  - Target Audience
  - Key Messages
  - Deliverables
  - Brand Tone
  - Visual Direction
- **Structured Output:** Organized insights display
- **Action Suggestions:** Recommended next steps

**Technical Details:**
- **Edge Function:** `supabase/functions/process-brief/index.ts`
- **Document Parser:** `src/lib/documentParser.ts` (PDF/DOCX extraction)
- **AI Model:** `google/gemini-2.5-pro` for analysis
- **Storage:** Briefs stored in `artie_context_memory` table

**User Flow:**
1. Upload brief document
2. AI processes and extracts insights
3. Review structured insights
4. Use insights to guide Studio generation

---

### 12. Analytics Dashboard

**Location:** `src/pages/Analytics.tsx`, `src/components/UserAnalytics.tsx`

**Capabilities:**
- **Usage Tracking:** Generations, edits, blends, upscales
- **Credit Usage:** Track credit consumption over time
- **Activity Timeline:** Chronological activity log
- **Performance Metrics:** Success rates, average processing times
- **Export Data:** Download analytics data

**Technical Details:**
- **Data Source:** `generated_assets`, `credit_transactions` tables
- **Visualization:** Recharts library for charts
- **Time Ranges:** Daily, weekly, monthly views

**User Flow:**
1. Navigate to Analytics
2. View usage charts and metrics
3. Filter by date range
4. Export data if needed

---

### 13. Settings

**Location:** `src/pages/Settings.tsx`

**Capabilities:**
- **Profile Management:** Update username, email, avatar
- **Email Preferences:** Delivery settings, notifications
- **Privacy Settings:** Data sharing preferences
- **Keyboard Shortcuts:** View and customize shortcuts
- **Theme:** Light/dark mode toggle
- **Account Deletion:** Remove account and data

**Technical Details:**
- **Profile Table:** `profiles` table
- **Email Delivery:** `email_delivery_preferences` table
- **Theme:** `next-themes` library with system preference detection

---

### 14. Subscription Management

**Location:** `src/pages/Subscriptions.tsx`, `src/pages/SubscriptionHistory.tsx`, `src/pages/BillingHistory.tsx`

**Capabilities:**
- **Plan Selection:** View and choose subscription tier
- **Stripe Integration:** Secure checkout and payment
- **Subscription Management:** Update, cancel, change plans
- **Billing History:** View past invoices and charges
- **Usage Tracking:** Monitor daily limits and credits

**Subscription Tiers:**
1. **Free:** 10 trial credits (one-time)
2. **Starter:** $X/month, 10 operations/day
3. **Pro:** $X/month, unlimited operations
4. **Enterprise:** Custom pricing, unlimited + support

**Technical Details:**
- **Stripe Integration:** Edge functions for checkout and webhooks
- **Database:** `profiles` table stores subscription info
- **Billing Events:** `billing_events` table for audit trail
- **Webhooks:** `subscription-webhook` edge function processes Stripe events

---

### 15. Admin Dashboard

**Location:** `src/pages/Admin.tsx`

**Capabilities:**
- **User Management:** View, edit, ban users
- **Analytics:** Platform-wide usage metrics
- **Content Moderation:** Review and moderate community posts
- **Pricing Management:** Update subscription prices
- **System Health:** Monitor edge functions, database, storage
- **Credit Audit Log:** Track all credit transactions
- **Invite Tracking:** Monitor referral system
- **Visitor Analytics:** Track page views and user behavior
- **Testimonials Management:** Curate user testimonials

**Technical Details:**
- **Admin Check:** `useAdminCheck` hook verifies admin role
- **RLS Policies:** Admin-specific policies for data access
- **Components:** Modular admin components in `src/components/admin/`

---

## Technical Architecture

### Frontend Stack

**Core Technologies:**
- **React 18.3.1:** UI framework with hooks and concurrent features
- **TypeScript 5.8.3:** Type safety and developer experience
- **Vite 5.4.21:** Build tool and dev server
- **React Router 6.30.1:** Client-side routing
- **TanStack Query 5.83.0:** Server state management and caching

**UI Framework:**
- **shadcn/ui:** Component library built on Radix UI
- **Radix UI:** Accessible, unstyled components
- **Tailwind CSS 3.4.17:** Utility-first styling
- **Framer Motion 12.23.24:** Animations and transitions
- **Lucide React:** Icon library

**State Management:**
- **React Context:** `AuthContext`, `ToolsModalContext`
- **Zustand Stores:** `studioStore`, `modalStore`, `unifiedVisualContext`
- **TanStack Query:** Server state, caching, synchronization

**Performance:**
- **Code Splitting:** Lazy loading for routes and heavy components
- **Image Optimization:** `browser-image-compression` library
- **Service Worker:** Workbox for offline support and caching
- **Request Deduplication:** Prevents duplicate API calls
- **Optimistic Updates:** Instant UI feedback

### Backend Stack

**Supabase Services:**
- **PostgreSQL:** Primary database
- **Edge Functions:** Deno-based serverless functions
- **Storage:** Object storage for images
- **Auth:** User authentication and session management
- **Realtime:** WebSocket subscriptions for live updates
- **RLS (Row Level Security):** Database-level access control

**AI Integration:**
- **Lovable AI Gateway:** Unified API for multiple AI models
- **Models Used:**
  - `google/gemini-3-pro-image-preview` (Nano Banana Pro) - Image generation
  - `google/gemini-2.5-flash-image-preview` - Image editing, blending, upscaling
  - `google/gemini-2.5-pro` - Text analysis, chat, brief processing

**External Services:**
- **Stripe:** Payment processing and subscription management
- **Sentry:** Error tracking and monitoring
- **Mixpanel:** Analytics and user tracking

### Development Tools

**Build & Dev:**
- **Vite:** Fast HMR and optimized builds
- **SWC:** Fast TypeScript/JSX compilation
- **PostCSS:** CSS processing
- **Autoprefixer:** CSS vendor prefixing

**Code Quality:**
- **ESLint:** Linting and code quality
- **TypeScript:** Type checking
- **Vitest:** Unit testing framework
- **Playwright:** E2E testing

**Deployment:**
- **Vercel:** Frontend hosting
- **Supabase:** Backend hosting
- **GitHub Pages:** Alternative static hosting

---

## Database Schema

### Core Tables

#### `profiles`
User profile and subscription information.

```sql
- id (uuid, PK, references auth.users)
- username (text)
- email (text)
- avatar_url (text)
- subscription_tier (text: 'free' | 'starter' | 'pro' | 'enterprise')
- is_pro (boolean)
- subscription_expires_at (timestamptz)
- stripe_customer_id (text)
- stripe_subscription_id (text)
- free_credits (integer, default 10)
- daily_limit (integer, default 10)
- daily_usage (integer, default 0)
- daily_usage_reset_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `generated_assets`
All generated, edited, blended, upscaled images and analyses.

```sql
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- type (text: 'analyze' | 'blend' | 'upscale' | 'generate' | 'batch' | 'edit')
- action (text: action type)
- image_url (text): Full resolution image URL
- thumbnail_url (text): 1024px thumbnail URL
- prompt (text): Associated prompt
- analysis_data (jsonb): Analysis results, deep understanding
- source_urls (jsonb): Array of source image URLs
- params (jsonb): Tool-specific parameters
- duration_ms (integer): Processing time
- share_slug (text): Unique share identifier
- created_at (timestamptz)
```

#### `credit_transactions`
Audit log of all credit usage and purchases.

```sql
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- transaction_type (text: 'deduct' | 'purchase' | 'refund')
- amount (integer): Credits amount
- reason (text): Transaction reason
- metadata (jsonb): Additional context
- created_at (timestamptz)
```

#### `billing_events`
Unified billing history from Stripe.

```sql
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- event_type (text): 'subscription_charge' | 'payment' | 'refund'
- amount_cents (integer)
- currency (text, default 'usd')
- stripe_payment_intent (text)
- stripe_subscription_id (text)
- stripe_invoice_id (text)
- metadata (jsonb)
- status (text: 'completed' | 'pending' | 'failed')
- created_at (timestamptz)
```

#### `idempotency_cache`
Prevents duplicate API requests.

```sql
- key (text, PK): Idempotency key
- response (jsonb): Cached response
- created_at (timestamptz)
- expires_at (timestamptz): 1 hour TTL
```

### Artie Intelligence Tables

#### `artie_conversations`
Persistent conversation threads.

```sql
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- title (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- metadata (jsonb)
```

#### `artie_messages`
Individual messages within conversations.

```sql
- id (uuid, PK)
- conversation_id (uuid, FK to artie_conversations)
- role (text: 'user' | 'assistant' | 'system')
- content (text)
- attachments (jsonb): File attachments
- tool_calls (jsonb): Tool invocation data
- created_at (timestamptz)
- metadata (jsonb)
```

#### `artie_context_memory`
Context memory for images, briefs, preferences.

```sql
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- conversation_id (uuid, FK to artie_conversations, nullable)
- context_type (text: 'image' | 'brief' | 'preference' | 'workflow')
- context_data (jsonb)
- created_at (timestamptz)
- expires_at (timestamptz, nullable)
- metadata (jsonb)
```

#### `artie_user_interactions`
Training data collection (with opt-out).

```sql
- id (uuid, PK)
- user_id (uuid, FK to auth.users)
- conversation_id (uuid, FK to artie_conversations, nullable)
- interaction_type (text: 'message' | 'tool_use' | 'feedback' | 'workflow')
- interaction_data (jsonb)
- include_in_training (boolean, default true)
- created_at (timestamptz)
- metadata (jsonb)
```

#### `artie_image_analysis_cache`
Cached image analysis results.

```sql
- id (uuid, PK)
- image_url (text, UNIQUE)
- analysis (jsonb)
- created_at (timestamptz)
- updated_at (timestamptz)
- access_count (integer, default 0)
- last_accessed_at (timestamptz)
```

### Community Tables

#### `community_posts`
Public community gallery posts.

```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- image_url (text)
- caption (text)
- created_at (timestamptz)
- likes_count (integer, default 0)
- comments_count (integer, default 0)
```

#### `community_comments`
Comments on community posts.

```sql
- id (uuid, PK)
- post_id (uuid, FK to community_posts)
- user_id (uuid, FK to profiles)
- comment_text (text)
- created_at (timestamptz)
```

#### `community_likes`
Like tracking for community posts.

```sql
- id (uuid, PK)
- post_id (uuid, FK to community_posts)
- user_id (uuid, FK to profiles)
- created_at (timestamptz)
- UNIQUE (post_id, user_id)
```

### Indexes

**Performance Indexes:**
- `generated_assets`: `(user_id, created_at DESC)`, `(type, created_at DESC)`
- `artie_conversations`: `(user_id, updated_at DESC)`
- `artie_messages`: `(conversation_id, created_at)`
- `artie_context_memory`: `(user_id, context_type, created_at DESC)`
- `community_posts`: `(created_at DESC)`, `(likes_count DESC, comments_count DESC)`
- `idempotency_cache`: `(expires_at)` for cleanup

### Row Level Security (RLS)

**Policy Pattern:**
- Users can only view/edit their own data
- Public read for community posts
- Authenticated write for community
- Admin policies for admin dashboard
- Service role policies for edge functions

---

## API & Edge Functions

### Edge Functions Overview

**Total Functions:** 31  
**Language:** Deno (TypeScript)  
**Runtime:** Supabase Edge Runtime

### Core Tool Functions

#### `analyze-image`
Analyzes images with 12-category breakdown.

**Input:**
```typescript
{
  image: string; // base64 data URL
  idempotencyKey: string;
}
```

**Output:**
```typescript
{
  analysis: AnalysisResult; // 12 categories
  regeneratedPrompt: string;
  cached: boolean;
}
```

**Process:**
1. Authenticate user
2. Check feature access
3. Validate image (size, format)
4. Check idempotency cache
5. Call AI Gateway with Gemini 2.5 Pro
6. Parse analysis JSON
7. Cache result
8. Return analysis

#### `blend-images`
Blends 2-4 images together.

**Input:**
```typescript
{
  images: string[]; // base64 data URLs
  instruction: string;
  idempotencyKey: string;
}
```

**Output:**
```typescript
{
  image: string; // blended image URL
  thumbnail: string;
}
```

**Process:**
1. Authenticate user
2. Check feature access
3. Validate images (count, size, format)
4. Check idempotency cache
5. Call AI Gateway with Gemini 2.5 Flash Image
6. Extract blended image from response
7. Upload to storage
8. Return URLs

#### `upscale-image`
Upscales images to higher resolution.

**Input:**
```typescript
{
  image: string; // base64 data URL
  targetSize: "1536x1536" | "2048x2048";
  idempotencyKey: string;
}
```

**Output:**
```typescript
{
  image: string; // upscaled image URL
  thumbnail: string;
}
```

**Process:**
1. Authenticate user
2. Check feature access
3. Validate image
4. Check idempotency cache
5. Call AI Gateway with upscale prompt
6. Extract upscaled image
7. Upload to storage
8. Return URLs

#### `edit-image`
Edits images based on instructions.

**Input:**
```typescript
{
  image: string; // base64 data URL
  instruction: string;
  quality?: "high" | "medium" | "low";
  size?: string;
  region?: RegionData;
  mask?: string;
  idempotencyKey: string;
}
```

**Output:**
```typescript
{
  image: string; // edited image URL
  thumbnail: string;
}
```

**Process:**
1. Authenticate user
2. Check feature access
3. Validate image and instruction
4. Check idempotency cache
5. Call AI Gateway with edit instruction
6. Extract edited image
7. Upload to storage
8. Return URLs

#### `generate-image`
Generates images from prompts.

**Input:**
```typescript
{
  prompt: string;
  referenceImage?: string; // base64 data URL
  continuationStrength?: number; // 0-100
  aspectRatio?: string;
  quality?: "high" | "medium" | "low";
  size?: string;
  idempotencyKey: string;
}
```

**Output:**
```typescript
{
  image: string; // generated image URL
  thumbnail: string;
  prompt: string; // final prompt used
}
```

**Process:**
1. Authenticate user
2. Check feature access
3. Validate prompt and reference image
4. Check idempotency cache
5. Call AI Gateway with Gemini 3 Pro Image
6. Extract generated image
7. Upload to storage
8. Return URLs

### Artie Functions

#### `artie-chat`
Main Artie conversation handler.

**Input:**
```typescript
{
  messages: Message[];
  contextMemory?: ContextMemory;
  uploadedFiles?: FileData[];
}
```

**Output:**
```typescript
{
  message: string;
  toolCalls?: ToolCall[];
  images?: string[];
}
```

**Process:**
1. Authenticate user
2. Load context from database
3. Process uploaded files (images, PDFs, DOCX)
4. Build system prompt with context
5. Call AI Gateway with Gemini 2.5 Pro
6. Parse tool calls from response
7. Execute tool calls if needed
8. Save conversation to database
9. Return response

**Tool Calls Supported:**
- `generate_image`: Open Studio
- `edit_image`: Open Edit tool
- `blend_images`: Open Blend tool
- `upscale_image`: Open Upscale tool
- `analyze_image`: Analyze image

#### `process-brief`
Processes creative briefs (PDF/DOCX).

**Input:**
```typescript
{
  file: string; // base64 file data
  fileName: string;
  fileType: string;
}
```

**Output:**
```typescript
{
  summary: string;
  keyInsights: string[];
  targetAudience: string;
  deliverables: string[];
  tonalKeywords: string[];
  textExcerpt: string;
}
```

**Process:**
1. Authenticate user
2. Extract text from PDF/DOCX
3. Call AI Gateway to analyze brief
4. Extract structured insights
5. Save to context memory
6. Return insights

### Access Control Functions

#### `check-feature-access`
Verifies user can access a feature.

**Input:**
```typescript
{
  action: "analyze_image" | "blend_images" | "upscale_image" | "generate_image";
}
```

**Output:**
```typescript
{
  allowed: boolean;
  bypass: boolean; // true for Pro/Enterprise
  tier: string;
  remaining?: number;
  upgrade_required?: boolean;
  reason?: string;
}
```

**Logic:**
- **Pro/Enterprise:** `bypass: true`, unlimited access
- **Starter:** Check daily limit, increment if allowed
- **Free:** Check credits, decrement if available

### Billing Functions

#### `create-subscription-checkout`
Creates Stripe checkout session.

**Input:**
```typescript
{
  priceId: string;
  planName: string;
}
```

**Output:**
```typescript
{
  url: string; // Stripe checkout URL
}
```

#### `create-portal-session`
Creates Stripe customer portal session.

**Output:**
```typescript
{
  url: string; // Stripe portal URL
}
```

#### `subscription-webhook`
Processes Stripe webhook events.

**Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Actions:**
- Update `profiles.subscription_tier`
- Update `profiles.subscription_expires_at`
- Log billing events
- Handle payment failures

### Utility Functions

#### `deduct-credits`
Deducts credits from user account.

#### `send-image-email`
Sends generated images via email.

#### `send-notification-email`
Sends system notifications.

#### `reset-daily-usage`
Resets daily usage counters (scheduled).

#### `verify-payment`
Verifies Stripe payment status.

### Shared Modules

**Location:** `supabase/functions/_shared/`

#### `validation.ts`
Input validation utilities:
- File size checks (max 15MB)
- Format validation (JPG, PNG, WebP)
- Image count validation
- Instruction length validation

#### `idempotency.ts`
Idempotency cache management:
- Generate cache keys
- Check cache
- Store responses
- Cleanup expired entries

#### `errors.ts`
Error message mapping:
- Technical errors → user-friendly messages
- HTTP status codes → actionable guidance

#### `retry.ts`
Retry logic with exponential backoff:
- Max retries: 1
- Delay: 2 seconds
- Timeout: 45 seconds

#### `thumbnails.ts`
Thumbnail generation (future):
- Generate 1024px thumbnails
- Store in separate bucket path

---

## Frontend Architecture

### Component Structure

**Total Components:** 165+  
**Organization:**
```
src/components/
├── ui/              # shadcn/ui base components
├── admin/           # Admin dashboard components
├── artie/           # Artie-specific components
├── community/       # Community features
├── edit-image/      # Image editing components
├── landing/         # Landing page components
└── skeletons/       # Loading skeletons
```

### Key Components

#### `UnifiedToolsModal`
Central tool dispatcher that routes to:
- `ImageBlendDialog`
- `ImageUpscaleDialog`
- `BatchProcessDialog` (disabled)
- `ImageGenerationDialog`

#### `UniversalImageWorkspace`
Unified workspace for viewing and managing images:
- Image display with zoom
- Quick actions (edit, upscale, blend, save)
- Visual troubleshooting
- User behavior tracking

#### `ImageEditor`
Main image editing interface:
- Basic adjustments panel
- Advanced editing panel
- Instruction input
- Before/after comparison

#### `ArtieChat`
Artie conversation interface:
- Message display
- File upload
- Tool call execution
- Context memory display

#### `GeneratedImagesGallery`
History/projects gallery:
- Grid/list view
- Search and filter
- Batch selection
- Share functionality

### Hooks Architecture

**Custom Hooks:** 25+

#### State Management Hooks
- `useAuth`: Authentication state
- `useSubscription`: Subscription data
- `useCredits`: Credit balance
- `useFeatureAccess`: Feature gating
- `useToolState`: Tool state machine

#### Data Hooks
- `useOptimizedQuery`: Optimized data fetching
- `useBatchedRequests`: Request batching
- `useRequestDeduplication`: Prevent duplicates
- `useOptimisticMutation`: Optimistic updates

#### UI Hooks
- `useMobile`: Mobile detection
- `useKeyboardShortcuts`: Keyboard navigation
- `usePullToRefresh`: Mobile pull-to-refresh
- `useScrollLock`: Prevent body scroll
- `useIntersectionObserver`: Lazy loading

#### Intelligence Hooks
- `useIntelligence`: Intelligence framework access
- `useArtieCore`: Artie chat logic
- `useArtieContext`: Artie context management
- `useSmartDefaults`: Smart default values

### Context Providers

#### `AuthProvider`
Manages authentication state:
- User session
- Sign in/up/out
- Session persistence
- Analytics tracking

#### `ToolsModalProvider`
Manages tool modal state:
- Active tool
- Tool inputs
- Tool state (idle/loading/success/error)
- Scroll position restoration

### State Management

#### Zustand Stores
- `studioStore`: Studio state (prompt, settings)
- `modalStore`: Modal state management
- `unifiedVisualContext`: Visual context across features

#### TanStack Query
- Server state caching
- Automatic refetching
- Optimistic updates
- Background synchronization

### Routing

**Routes:**
- `/` - Landing/Studio
- `/artie` - Artie chat
- `/dashboard` - User dashboard
- `/community` - Community gallery
- `/analytics` - User analytics
- `/insights` - Brief analysis
- `/settings` - User settings
- `/subscriptions` - Subscription management
- `/admin` - Admin dashboard
- `/shared/:token` - Shared asset view
- `/auth` - Authentication

**Route Protection:**
- Auth required for most routes
- Admin required for `/admin`
- Public routes: `/`, `/community`, `/shared/:token`

---

## User Flows & Workflows

### Primary Workflow: Brief to Deliverable

1. **Upload Brief** → Insights page
2. **Review Insights** → AI extracts key information
3. **Generate Concepts** → Studio with insights-based prompts
4. **Refine Images** → Edit tool for adjustments
5. **Combine Ideas** → Blend tool for variations
6. **Finalize** → Upscale for production quality
7. **Share** → Generate shareable link or post to community

### Studio Workflow

1. **Enter Prompt** or **Upload Reference Image**
2. **Adjust Settings:**
   - Aspect ratio
   - Quality
   - Continuation strength (if reference)
3. **Generate** → View result
4. **Iterate:**
   - Regenerate with same prompt
   - Generate variations
   - Edit prompt and regenerate
5. **Save** → Add to My Projects

### Analysis Workflow

1. **Upload Image** to Studio
2. **Click Analyze** → Progressive feedback appears
3. **Review Analysis:**
   - 12-category breakdown
   - Auto-generated prompt
4. **Adjust Guided Tweaks** → Prompt updates live
5. **Generate from Analysis** → Studio opens with prompt

### Artie Workflow

1. **Open Artie Chat**
2. **Ask Question** or **Upload File:**
   - Image for analysis
   - Brief for processing
   - General creative question
3. **Artie Responds** with:
   - Analysis or insights
   - Tool suggestions
   - Next steps
4. **Follow Suggestions:**
   - Click tool action chips
   - Use integrated tool calls
5. **Continue Conversation** → Context maintained

### Editing Workflow

1. **Open Image in Edit Tool**
2. **Choose Method:**
   - Slider adjustments
   - Instruction-based editing
   - Advanced editing (object replacement, etc.)
3. **Preview Changes** → Before/after comparison
4. **Apply Edit** → Processed image appears
5. **Save** → Added to My Projects

### Blending Workflow

1. **Open Blend Tool**
2. **Upload 2-4 Images**
3. **Enter Blend Instruction**
4. **Click Blend** → Processed
5. **View Result** → Blended image
6. **Save or Generate Variations**

### Upscaling Workflow

1. **Open Upscale Tool**
2. **Upload Image**
3. **Select Target Size** (1536×1536 or 2048×2048)
4. **Click Upscale** → Processed
5. **Compare** → Before/after slider
6. **Download or Save**

---

## Subscription & Billing System

### Subscription Tiers

#### Free Tier
- **Credits:** 10 trial credits (one-time)
- **Daily Limit:** None (credit-based)
- **Features:** All tools available
- **Storage:** Standard
- **Support:** Community only

#### Starter Tier
- **Price:** $X/month
- **Daily Limit:** 10 operations/day
- **Features:** All tools available
- **Storage:** Standard
- **Support:** Email support

#### Pro Tier
- **Price:** $X/month
- **Daily Limit:** Unlimited
- **Features:** All tools, priority processing
- **Storage:** Enhanced
- **Support:** Priority email support

#### Enterprise Tier
- **Price:** Custom
- **Daily Limit:** Unlimited
- **Features:** All tools, custom integrations, SLA
- **Storage:** Custom
- **Support:** Dedicated support

### Billing Flow

1. **User Selects Plan** → Subscriptions page
2. **Click Subscribe** → `create-subscription-checkout` called
3. **Redirect to Stripe** → Checkout session
4. **Payment Processed** → Stripe webhook fires
5. **Webhook Handler** → Updates profile, logs billing event
6. **User Redirected** → Subscription success page
7. **Profile Updated** → Access granted immediately

### Credit System

**Credit Deduction:**
- Analyze: 1 credit
- Generate: 1 credit
- Edit: 1 credit
- Blend: 1 credit
- Upscale: 1 credit

**Credit Tracking:**
- `credit_transactions` table logs all transactions
- `profiles.free_credits` stores current balance
- Real-time updates via TanStack Query

### Daily Limits

**Starter Tier:**
- `profiles.daily_usage` tracks usage
- `profiles.daily_limit` = 10
- `profiles.daily_usage_reset_at` = next midnight
- Edge function `reset-daily-usage` runs daily

**Pro/Enterprise:**
- `daily_limit` = 999999 (effectively unlimited)
- No daily usage tracking

---

## Admin & Management Features

### Admin Dashboard Sections

#### Overview
- Platform-wide metrics
- User growth charts
- Revenue charts
- Activity trends

#### User Management
- User list with search/filter
- User details view
- Ban/unban users
- Edit user profiles
- View user activity

#### Audit Log
- Credit transaction log
- Feature access log
- Admin action log
- Export capabilities

#### Content Moderation
- Community post review
- Flagged content queue
- Remove posts/comments
- User warnings

#### Pricing Management
- Update subscription prices
- Create promotional codes
- Manage plan features

#### System Health
- Edge function status
- Database performance
- Storage usage
- Error rates

#### Invite Tracking
- Referral system metrics
- Invite code usage
- Conversion tracking

#### Visitor Analytics
- Page view tracking
- User behavior flows
- Conversion funnels
- Geographic data

#### Testimonials Management
- Curate user testimonials
- Approve/reject submissions
- Display on landing page

### Admin Access Control

**Admin Check:**
- `useAdminCheck` hook verifies admin role
- Database function `has_role(user_id, 'admin')`
- RLS policies restrict admin data access

---

## Performance & Optimization

### Frontend Optimizations

**Code Splitting:**
- Route-based splitting (lazy loading)
- Component-based splitting for heavy components
- Dynamic imports for modals

**Image Optimization:**
- Browser-side compression before upload
- Thumbnail generation (1024px)
- Lazy loading for galleries
- Progressive image loading

**Caching Strategy:**
- TanStack Query: 10min stale time, 60min cache time
- Service Worker: Offline support, asset caching
- Browser cache: Static assets

**Request Optimization:**
- Request deduplication
- Request batching
- Optimistic updates
- Background synchronization

### Backend Optimizations

**Idempotency:**
- Prevents duplicate requests
- 1-hour cache TTL
- Automatic cleanup

**Database:**
- Indexed queries
- Connection pooling
- Query optimization
- RLS policy optimization

**Edge Functions:**
- Cold start optimization
- Response caching
- Retry logic with backoff
- Timeout handling (45s)

### Performance Targets

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Image Generation:** < 10s (Nano Banana Pro)
- **Analysis:** < 5s
- **Edge Function Response:** < 30s (with retry)

---

## Security & Compliance

### Authentication

**Supabase Auth:**
- Email/password authentication
- JWT-based sessions
- Secure password hashing
- Email verification (optional)

**Session Management:**
- Automatic token refresh
- Secure cookie storage
- Session timeout handling

### Authorization

**Row Level Security (RLS):**
- Database-level access control
- User can only access own data
- Admin policies for admin access
- Public read for community

**Feature Gating:**
- Subscription tier checks
- Credit balance checks
- Daily limit enforcement
- Edge function-level validation

### Data Protection

**Input Validation:**
- File size limits (15MB)
- File type validation
- Instruction length limits
- SQL injection prevention

**Storage Security:**
- Private buckets for user data
- Public buckets for community
- Signed URLs for temporary access
- CORS policies

### Compliance

**GDPR:**
- User data export
- Account deletion
- Privacy settings
- Data retention policies

**Privacy:**
- Opt-out for training data
- Secure data transmission (HTTPS)
- No third-party data sharing (except Stripe)

---

## Analytics & Monitoring

### User Analytics

**Tracked Events:**
- Page views
- Feature usage
- Generation success/failure
- Credit usage
- Subscription events

**Tools:**
- Mixpanel: User behavior tracking
- Sentry: Error tracking
- Custom analytics: Platform metrics

### Performance Monitoring

**Metrics:**
- Edge function response times
- Database query performance
- Image processing times
- Error rates
- User session duration

**Tools:**
- Supabase logs
- Sentry performance monitoring
- Custom performance hooks

---

## Intelligence Framework

### Overview

The Intelligence Framework makes the platform feel alive, smart, and deeply creative. It consists of four core modules:

### 1. Image Understanding

**Purpose:** Deep analysis of images to capture comprehensive metadata

**Features:**
- Scene analysis (objects, subject, background)
- Visual properties (lighting, mood, color palette, style)
- Composition analysis (rule of thirds, depth, framing)
- Technical assessment (noise, blur, sharpness, exposure)
- Improvement suggestions

**Storage:** `generated_assets.analysis_data.deepUnderstanding`  
**Cache:** 24-hour cache

### 2. Prompt Intelligence

**Purpose:** Context-locked prompt synthesis that prevents drift

**Features:**
- Combines user prompt + image analysis + user preferences
- Maintains image fidelity while allowing variations
- Generates art-director level prompts
- Analyzes prompt drift potential

**Usage:** Automatically used in Studio when opening with an image

### 3. User Behavior Learning

**Purpose:** Observe and learn from user actions

**Features:**
- Tracks: upscale, blend, edit, save, reject actions
- Learns: preferred styles, colors, lighting, subject matter
- Builds: editing patterns, quality preferences
- Provides: personalized suggestions

**Storage:** `artie_context_memory` (context_type: 'preference')

### 4. Visual Troubleshooting

**Purpose:** Auto-detect issues and provide one-click fixes

**Features:**
- Detects: overexposure, underexposure, uneven lighting, clarity issues
- Provides: Quick fix buttons with instructions
- Suggests: Adjustment values for automatic fixes

**Usage:** Automatically shown in UniversalImageWorkspace

### Integration Points

- **Studio:** Auto-synthesizes context-locked prompts
- **UniversalImageWorkspace:** Visual troubleshooting, behavior tracking
- **Artie Chat:** Can use intelligence for better context (future)

---

## Mobile & Responsive Design

### Mobile Optimizations

**Touch Targets:**
- Minimum 44px touch targets
- Thumb-friendly button placement
- Bottom navigation for mobile

**Responsive Layout:**
- Mobile-first design
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible grid systems

**Mobile Features:**
- Pull-to-refresh
- Swipe gestures
- Mobile-optimized modals (drawer on mobile, dialog on desktop)
- Keyboard handling (iOS safe area)

### Progressive Web App (PWA)

**Service Worker:**
- Offline support
- Asset caching
- Background sync

**Manifest:**
- App icons
- Theme colors
- Display mode

---

## Future Enhancement Roadmap

### Short-Term (1-3 months)

1. **Enhanced Image Editing:**
   - Region selection with actual mask support
   - Advanced adjustment sliders (shadows, highlights, clarity)
   - Batch editing capabilities

2. **Preset System:**
   - Full preset gallery implementation
   - User-created presets
   - Preset sharing

3. **Collaboration Features:**
   - Team workspaces
   - Shared projects
   - Client commenting

4. **Performance Improvements:**
   - CDN for image delivery
   - Server-side thumbnail generation
   - Progressive image loading

### Medium-Term (3-6 months)

1. **Advanced Intelligence:**
   - Multi-step task processing
   - Blend intelligence (semantic understanding)
   - Studio intent prediction

2. **Export & Integration:**
   - Export to cloud storage (S3, GCS)
   - API for third-party integrations
   - Webhook support

3. **Video Support:**
   - Video generation
   - Video editing
   - Video upscaling

4. **Advanced Analytics:**
   - Creative performance metrics
   - A/B testing framework
   - Conversion tracking

### Long-Term (6-12 months)

1. **Enterprise Features:**
   - Custom branding
   - SSO integration
   - Advanced permissions
   - Custom workflows

2. **AI Enhancements:**
   - Custom model training
   - Style transfer
   - Advanced inpainting
   - 3D generation

3. **Marketplace:**
   - Template marketplace
   - Preset marketplace
   - Asset marketplace

4. **Mobile Apps:**
   - Native iOS app
   - Native Android app
   - Offline-first architecture

---

## Technical Debt & Known Issues

### Critical Issues

1. **Region Selection in Edit Tool:**
   - UI supports region selection
   - Backend doesn't use region/mask data
   - Needs enhancement in `edit-image` edge function

2. **Advanced Edit Panel:**
   - Component interface mismatch
   - Needs refactoring

3. **Batch Tool:**
   - Temporarily disabled
   - Needs re-enablement and testing

### Performance Issues

1. **Large Bundle Sizes:**
   - Need code splitting optimization
   - Tree shaking improvements

2. **Image Loading:**
   - Need CDN integration
   - Progressive loading implementation

### UX Improvements Needed

1. **Keyboard Shortcuts:**
   - More comprehensive shortcuts
   - Customizable shortcuts

2. **Undo/Redo:**
   - Operation history
   - Undo capability

3. **Version Control:**
   - Asset versioning
   - Revert to previous versions

---

## Development Guidelines

### Code Standards

**TypeScript:**
- Strict mode enabled
- No `any` types
- Proper type definitions

**React:**
- Functional components only
- Hooks for state management
- Proper cleanup in useEffect

**Styling:**
- Tailwind CSS utility classes
- Consistent spacing scale
- Dark mode support

### Testing

**Unit Tests:**
- Vitest for component testing
- Test utilities in `src/tests/`

**E2E Tests:**
- Playwright for end-to-end testing
- Test files in `e2e/`

### Deployment

**Frontend:**
- Vercel automatic deployment
- Preview deployments for PRs
- Production deployment on merge

**Backend:**
- Supabase Edge Functions auto-deploy
- Database migrations via Supabase CLI
- Manual deployment available

---

## Conclusion

This PRD provides a comprehensive overview of Art Director Studio's current state, architecture, and capabilities. The platform is a sophisticated AI-powered creative workspace with:

- **4 Core Tools:** Analyze, Blend, Upscale, Edit
- **AI Creative Copilot:** Artie with context memory and tool integration
- **Complete Workflow:** From brief to deliverable
- **Professional Quality:** 4K generation, advanced editing
- **Intelligence Framework:** Image understanding, prompt intelligence, behavior learning
- **Community Features:** Public gallery, social engagement
- **Enterprise Ready:** Subscription tiers, admin dashboard, analytics

The platform is built on modern, scalable technologies and is ready for enhancement to become a "god-tier" design platform. The architecture supports extensibility, and the intelligence framework provides a foundation for advanced AI features.

**Next Steps for Development Team:**
1. Review and understand current architecture
2. Identify enhancement priorities
3. Plan technical improvements
4. Implement feature enhancements
5. Optimize performance
6. Add new capabilities

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Maintained By:** Development Team
