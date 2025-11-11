# Art Director Studio

An AI-powered creative agency workspace for concept development, content production, and brand collaboration.


## Overview

Art Director Studio brings creative strategy, production tools, and AI assistance into a single, streamlined workspace. Use it to ideate campaigns, generate visual directions, organize assets, collaborate with clients, and track performance — all while an AI creative partner (Artie) helps you move from brief to deliverables faster.

Technology stack: Vite + React + TypeScript, shadcn/ui, Tailwind CSS, TanStack Query, Supabase, Workbox, and modern performance practices.


## Features

- AI Creative Copilot (Artie)
  - Chat for ideas, briefs, and prompts
  - Continuation-aware assistance for refining concepts
- Image Generation & Inspiration
  - Prompt presets and a browsable gallery
  - Image optimization for web delivery
- Project and Asset Workflow
  - Unified tools modal for quick actions
  - Shareable links for assets and presentations
- Client Collaboration
  - Commenting, history, and version visibility
  - Role-based access with authentication via Supabase
- Insights and Analytics
  - Performance and usage dashboards for creative ops
- Subscriptions and Billing
  - Support for plans, billing history, and subscription flows
- Production-ready Frontend
  - Vite + React + TypeScript with shadcn/ui components
  - Tailwind CSS, dark mode, and responsive UI


## Getting Started

Prerequisites
- Node.js 18+ and npm 9+
- Supabase project (URL and public anon key)

1) Clone the repository
```
git clone https://github.com/justinlagos/artdirectorstudio.git
cd artdirectorstudio
```

2) Configure environment
Create a .env file in the project root and add your Supabase credentials:
```
VITE_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_PUBLIC_ANON_KEY"
```

3) Install dependencies
```
npm install
```

4) Run the development server
```
npm run dev
```
The app will start on http://localhost:5173 by default.

5) Build for production (optional)
```
npm run build
npm run preview
```


## Contact

- Issues and feature requests: https://github.com/justinlagos/artdirectorstudio/issues
- General inquiries: please open an issue or contact the repository owner via GitHub profile
