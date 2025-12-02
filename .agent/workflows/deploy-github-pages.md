---
description: Deploy to GitHub Pages with Namecheap domain
---

# Deploy to GitHub Pages with Custom Namecheap Domain

This workflow guides you through deploying your Vite application to GitHub Pages and connecting your Namecheap domain.

## Part 1: Configure GitHub Repository

### 1. Ensure your repository is on GitHub
```bash
git remote -v
```
If you don't see a GitHub remote, create a new repository on GitHub and add it:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### 2. Update vite.config.ts for GitHub Pages
The `base` property needs to be set to your repository name (unless using a custom domain at root):
- If using custom domain at root: `base: '/'` (current setting is correct)
- If deploying to username.github.io/repo-name: `base: '/repo-name/'`

Since you'll use a custom domain, the current config is correct.

### 3. Add GitHub Pages deployment script to package.json
Add this to the "scripts" section:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

### 4. Install gh-pages package
```bash
npm install --save-dev gh-pages
```

## Part 2: Configure Custom Domain in GitHub

### 1. Create CNAME file
Create a file named `CNAME` in the `public` folder with your domain:
```
yourdomain.com
```
(Replace with your actual domain, e.g., `artdirectorstudio.com`)

### 2. Push changes to GitHub
```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

### 3. Deploy to GitHub Pages
```bash
npm run deploy
```

### 4. Configure GitHub repository settings
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Source", select branch: `gh-pages` and folder: `/ (root)`
4. Under "Custom domain", enter your domain (e.g., `artdirectorstudio.com`)
5. Check "Enforce HTTPS" (after DNS propagates)

## Part 3: Configure Namecheap DNS

### 1. Log into Namecheap
Go to namecheap.com and log into your account

### 2. Navigate to Domain List
Click on "Domain List" and find your domain

### 3. Click "Manage" next to your domain

### 4. Go to "Advanced DNS" tab

### 5. Add DNS Records
Delete any existing A records and CNAME records, then add these:

**For apex domain (yourdomain.com):**
- Type: `A Record`
- Host: `@`
- Value: `185.199.108.153`
- TTL: `Automatic`

Add three more A records with the same Host `@`:
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

**For www subdomain:**
- Type: `CNAME Record`
- Host: `www`
- Value: `YOUR_GITHUB_USERNAME.github.io.` (note the trailing dot)
- TTL: `Automatic`

### 6. Save all changes

## Part 4: Verify Deployment

### 1. Wait for DNS propagation (can take 5-48 hours, usually faster)
Check DNS propagation: https://www.whatsmydns.net/

### 2. Test your domain
Visit your domain in a browser (both with and without www):
- `https://yourdomain.com`
- `https://www.yourdomain.com`

### 3. Verify HTTPS
Once DNS propagates, go back to GitHub Settings → Pages and enable "Enforce HTTPS"

## Part 5: Future Deployments

Whenever you want to deploy updates:

```bash
# Make your changes
git add .
git commit -m "Your commit message"
git push origin main

# Deploy to GitHub Pages
npm run deploy
```

## Troubleshooting

### Issue: 404 errors on page refresh
Add a `404.html` file that redirects to `index.html` for client-side routing.

### Issue: DNS not resolving
- Wait longer (DNS can take up to 48 hours)
- Clear your browser cache
- Try incognito/private browsing mode
- Check DNS with: `nslookup yourdomain.com`

### Issue: HTTPS certificate errors
- Make sure DNS has fully propagated before enabling HTTPS
- Wait 24 hours after DNS propagation
- Try disabling and re-enabling HTTPS in GitHub settings

### Issue: Custom domain keeps getting removed
Make sure the CNAME file is in the `public` folder (not root) so it gets copied to `dist` during build.
