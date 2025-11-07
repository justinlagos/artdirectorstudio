# Image Display Guidelines

## Critical Rules for Aspect Ratio Preservation

All images across the platform MUST preserve their original aspect ratios to avoid distortion and stretching. This guide ensures consistent, professional image display.

---

## Image Display Patterns

### 1. **Grid/Thumbnail Views** (Inspire, Gallery grids)
**Use Case:** Uniform grid layouts where visual consistency is important
**Pattern:** `object-cover` with fixed aspect-ratio containers

```tsx
<div className="aspect-square overflow-hidden bg-muted">
  <img
    src={imageUrl}
    alt="Description"
    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
    loading="lazy"
  />
</div>
```

**Why:** Creates a uniform grid where all images have the same container size. Images may be cropped but never stretched.

---

### 2. **Detail Views & Modals** (Full-size image views)
**Use Case:** Detailed image viewing where the entire image must be visible
**Pattern:** `object-contain` with flexible height containers

```tsx
<div className="bg-muted rounded-lg flex items-center justify-center min-h-[300px] p-4">
  <img
    src={imageUrl}
    alt="Description"
    className="w-full h-auto object-contain max-h-[70vh]"
  />
</div>
```

**Why:** Shows the complete image without cropping or stretching. The image scales down to fit but maintains proportions.

---

### 3. **Tool Result Displays** (Blend, Upscale results)
**Use Case:** Showing generated/processed images with accuracy
**Pattern:** `object-contain` with success indicators

```tsx
<div className="relative rounded-lg overflow-hidden bg-muted ring-2 ring-primary/20 flex items-center justify-center min-h-[300px]">
  <img 
    src={resultImage} 
    alt="Result" 
    className="w-full h-auto object-contain max-h-[600px]"
    onLoad={() => console.log('✅ Image loaded')}
    onError={(e) => console.error('❌ Image load failed:', e)}
  />
  <div className="absolute top-2 right-2">
    <Badge className="bg-green-500 text-white">✓ Completed</Badge>
  </div>
</div>
```

**Why:** Critical to show exact results without distortion. Includes error monitoring and visual feedback.

---

### 4. **Upload Preview** (Studio upload section)
**Use Case:** Previewing user-uploaded images before analysis
**Pattern:** Centered with max-height constraints

```tsx
<div className="relative inline-block bg-muted rounded-xl p-4 flex items-center justify-center min-h-[200px]">
  <OptimizedImage
    src={previewUrl} 
    alt="Preview" 
    className="max-h-80 w-auto object-contain mx-auto rounded-xl"
    sizes="(max-width: 768px) 100vw, 50vw"
    widths={[640, 1024]}
  />
</div>
```

**Why:** Shows user what they uploaded accurately before processing.

---

### 5. **Small Thumbnails** (Tool modal source images)
**Use Case:** Small preview images in multi-image tools
**Pattern:** Compact containers with contain

```tsx
<div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center w-24 h-24 p-1">
  <img 
    src={thumbUrl} 
    alt="Thumbnail" 
    className="max-w-full max-h-full object-contain"
  />
</div>
```

**Why:** Shows complete image even in small spaces without cropping.

---

### 6. **My Projects/History Cards**
**Use Case:** Project history with visual preview
**Pattern:** Flexible container with reasonable max-height

```tsx
<div className="rounded-xl overflow-hidden border border-border/50 bg-muted flex items-center justify-center min-h-[200px]">
  <img 
    src={projectImage} 
    alt="Project preview" 
    className="w-full h-full object-contain max-h-[400px]"
  />
</div>
```

**Why:** Shows project preview accurately while maintaining card layout consistency.

---

## Utility Classes (from index.css)

### Pre-built Image Container Classes:

```css
/* For modal/detail views */
.image-modal-container {
  @apply bg-muted rounded-lg flex items-center justify-center min-h-[300px] p-4;
}

.image-modal-display {
  @apply w-full h-auto object-contain max-h-[70vh];
}

/* For preview/thumbnail containers */
.image-preview-container {
  @apply bg-muted rounded-lg flex items-center justify-center min-h-[200px] p-2;
}

.image-preview-display {
  @apply max-w-full max-h-full object-contain;
}

/* For general aspect ratio preservation */
.image-container-preserve {
  @apply relative bg-muted rounded-lg overflow-hidden flex items-center justify-center;
}

.image-contain {
  @apply w-full h-auto object-contain;
}
```

---

## Key Properties Explained

### `object-fit: contain`
- Scales image to fit container while maintaining aspect ratio
- Shows entire image (no cropping)
- May leave empty space (letterboxing/pillarboxing)
- **Use for:** Detail views, results, previews

### `object-fit: cover`
- Scales image to fill container while maintaining aspect ratio
- May crop parts of image
- No empty space in container
- **Use for:** Grid thumbnails, uniform layouts

### Container Patterns

1. **Flex centering:**
   ```css
   display: flex;
   align-items: center;
   justify-content: center;
   ```
   Centers the image both horizontally and vertically.

2. **Min-height:**
   Ensures container doesn't collapse to zero before image loads.

3. **Max-height:**
   Prevents images from growing too large on detail views.

4. **Background:**
   `bg-muted` provides a neutral backdrop for transparent images or while loading.

---

## Common Mistakes to Avoid

❌ **DON'T:**
```tsx
// This stretches the image!
<img src={url} className="w-full h-full" />

// This crops without awareness
<img src={url} className="w-full aspect-video object-cover" />

// This has no container constraints
<img src={url} className="w-full" />
```

✅ **DO:**
```tsx
// Detail views - show everything
<div className="bg-muted flex items-center justify-center min-h-[300px]">
  <img src={url} className="w-full h-auto object-contain max-h-[70vh]" />
</div>

// Grid views - uniform layout
<div className="aspect-square bg-muted">
  <img src={url} className="w-full h-full object-cover" />
</div>
```

---

## Testing Checklist

- [ ] Test with landscape images (16:9, 4:3)
- [ ] Test with portrait images (9:16, 3:4)
- [ ] Test with square images (1:1)
- [ ] Test with ultra-wide panoramas (21:9)
- [ ] Test with vertical banners (2:3)
- [ ] Verify on mobile, tablet, and desktop
- [ ] Check both light and dark modes
- [ ] Verify rounded corners maintain
- [ ] Confirm no stretching occurs
- [ ] Test with very small images (<500px)
- [ ] Test with very large images (>4000px)

---

## Component-Specific Implementations

### History Page ✅
- Card previews use `object-contain` with max-h-[400px]

### Inspire Page ✅  
- Grid uses `object-cover` for uniformity (aspect-square)
- Detail modal uses `object-contain` with max-h-[70vh]

### Gallery Page ✅
- Grid uses `object-cover` for uniformity
- Detail modal uses `object-contain` with max-h-[70vh]

### Tool Modals ✅
- Blend result: `object-contain` with max-h-[600px]
- Upscale result: Uses BeforeAfterSlider (handles aspect ratio)
- Source previews: `object-contain` in fixed containers

### Upload Section ✅
- Preview uses OptimizedImage with max-h-80 and proper centering

### Shared Asset Page ✅
- Detail view uses `object-contain` with max-h-[70vh]

---

## Responsive Considerations

### Mobile
- Use `max-h-[70vh]` to prevent images from pushing content off-screen
- Ensure touch targets (44x44px minimum) for action buttons

### Tablet
- Balance between detail and layout
- Use responsive grid (1-2-3 columns)

### Desktop
- Allow larger images (max-h-[70vh])
- Wider containers (max-w-4xl, max-w-5xl)

---

## Accessibility

- Always include descriptive `alt` text
- Use `loading="lazy"` for off-screen images
- Add `onError` handlers for graceful failures
- Provide loading states while images load

---

## Performance

- Use OptimizedImage component for Supabase storage URLs
- Implement lazy loading for images below the fold
- Add proper `loading` and `decoding` attributes
- Use appropriate image sizes (don't serve 4K for thumbnails)

---

## Summary

**Golden Rule:** If the user needs to see the complete, accurate image → use `object-contain`. If you need a uniform grid → use `object-cover` with aspect-ratio containers.

Every image display should answer:
1. Do I need to show the entire image? → `object-contain`
2. Or do I need uniform grid sizing? → `object-cover` + `aspect-square`

Follow these patterns religiously to ensure professional, distortion-free image display across the entire platform.
