# Clearing Cache to See New Canvas Workspace

The dev server is running, but you're seeing the old version. This is likely due to browser cache.

## Quick Fix - Hard Refresh

**Chrome/Edge/Firefox:**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**
- Mac: `Cmd + Option + R`

## Clear Browser Cache

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

Or:

1. Open DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Click "Clear storage" or "Clear site data"
4. Check all boxes and click "Clear site data"
5. Refresh the page

## Verify New Routes Are Working

After clearing cache, try navigating to:
- `http://localhost:5173/canvas` - Should show document picker
- `http://localhost:5173/canvas/new` - Should create new document

## Check Console for Errors

Open browser console (F12) and check for:
- Import errors
- Route errors
- Component errors

If you see errors, they'll help identify what needs fixing.

## Service Worker (if in production mode)

If you're in production mode, the service worker might be caching. To clear:
1. Open DevTools → Application tab
2. Go to "Service Workers"
3. Click "Unregister"
4. Go to "Cache Storage"
5. Delete all caches
6. Hard refresh
