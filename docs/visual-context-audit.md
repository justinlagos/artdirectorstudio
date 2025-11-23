# Visual Context Audit

## Existing context surfaces
- **visualContextStore (`src/store/visualContextStore.ts`)** – provided base prompt, active image URL/ID, analysis data, and an operation history but lacked a structured payload tying image + prompt + origin together.
- **Artie chat + core hooks (`src/components/ArtieChat.tsx`, `src/hooks/useArtieCore.ts`)** – wrote to the context store when opening tools, but only updated the active image, leaving prompt/origin metadata behind.
- **Studio opener (`src/lib/studio.ts`)** – pushed prompts and images separately; downstream tools could not tell the origin or aspect ratio of a given image.
- **Edit Image wrapper (`src/components/edit-image/EditImageModalWrapper.tsx`)** – read prompts/analysis but did not push a combined context payload back into the store.

## Context breaks observed
- Moving from **Artie → Upscale/Blend** only transferred the last image; prompts were lost, so the tools fell back to defaults.
- Opening **Studio from Artie** did not mark the origin tool or aspect ratio, so later hops could not reference that metadata.
- Entering **Edit** ignored incoming analysis and did not store the combined prompt + image source, causing instructions to lack the original visual description.

## Fixes applied
- Introduced a **unified visual context payload** (image URL, prompt, tool origin, aspect ratio, style tags, meta) inside `visualContextStore` and wired new setter helpers.
- All tool jumps (Artie → Studio/Upscale/Blend, Edit → downstream) now call `setContextPayload` before opening, ensuring prompt + origin + metadata move together.
- Edit workspace builds **contextual instructions** that combine the original visual description, analysis cues, user instruction, slider adjustments, and region selection so AI receives the full picture.
