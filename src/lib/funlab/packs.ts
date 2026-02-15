import { COSTS } from '@/lib/costs';

import portraitPreview from '@/assets/funlab-previews/portrait-identity.svg';
import designPreview from '@/assets/funlab-previews/design-brand.svg';
import photoPreview from '@/assets/funlab-previews/photo-transforms.svg';
import conceptPreview from '@/assets/funlab-previews/concept.svg';
import typographyPreview from '@/assets/funlab-previews/typography-structure.svg';

const CATEGORY_PREVIEWS: Record<FunLabCategory, string> = {
  portrait_identity: portraitPreview,
  design_brand: designPreview,
  photo_transforms: photoPreview,
  concept: conceptPreview,
  typography_structure: typographyPreview,
};

export interface PackControl {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'slider';
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number; max?: number; step?: number; default?: number;
}

export type FunLabCategory =
  | 'portrait_identity'
  | 'design_brand'
  | 'photo_transforms'
  | 'concept'
  | 'typography_structure';

export interface FunLabPack {
  id: string;
  name: string;
  category: FunLabCategory;
  description: string;
  prompt_templates: [string, string, string];
  cost: number;
  controls?: PackControl[];
  preview_image?: string;
}

export const FUNLAB_CATEGORY_LABELS: Record<FunLabCategory, string> = {
  portrait_identity: 'Portrait & Identity',
  design_brand: 'Design & Brand',
  photo_transforms: 'Photo Transforms',
  concept: 'Concept',
  typography_structure: 'Typography & Structure',
};

export const FUNLAB_CATEGORIES: FunLabCategory[] = [
  'portrait_identity',
  'design_brand',
  'photo_transforms',
  'concept',
  'typography_structure',
];

// Typography pack controls shared across typography_structure packs
const TYPOGRAPHY_CONTROLS: PackControl[] = [
  { id: 'user_text', type: 'textarea', label: 'Text', placeholder: 'Enter text to fill the portrait…' },
  { id: 'text_style', type: 'select', label: 'Text style', options: [
    { value: 'handwritten', label: 'Handwritten script' },
    { value: 'newspaper', label: 'Newspaper typography' },
    { value: 'modern_sans', label: 'Modern sans' },
    { value: 'calligraphic', label: 'Calligraphic' },
    { value: 'mixed_type', label: 'Mixed type' },
  ]},
  { id: 'density', type: 'slider', label: 'Density', min: 0.1, max: 1.0, step: 0.05, default: 0.6 },
  { id: 'contrast', type: 'slider', label: 'Contrast', min: 0.1, max: 1.0, step: 0.05, default: 0.7 },
  { id: 'text_scale', type: 'slider', label: 'Text scale', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
  { id: 'mapping_mode', type: 'select', label: 'Mapping', options: [
    { value: 'edge_emphasis', label: 'Edge emphasis' },
    { value: 'full_face_fill', label: 'Full face fill' },
    { value: 'face_background', label: 'Face + background' },
    { value: 'shadow_mapping', label: 'Shadow mapping' },
  ]},
];

export const FUNLAB_PACKS: FunLabPack[] = [
  // ═══════════════════════════════════════════
  // PORTRAIT & IDENTITY (8 packs)
  // ═══════════════════════════════════════════
  {
    id: 'caricature_clean',
    name: 'Caricature Clean',
    category: 'portrait_identity',
    description: 'Polished studio caricature with subtle exaggeration',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Professional studio caricature of {{image_description}}. Subtle exaggeration of key facial features, warm studio lighting, smooth gradients, clean background. Polished digital illustration style, high-end feel.',
      'Elegant caricature portrait of {{image_description}}. Refined linework, watercolor wash coloring, soft bokeh background. Features gently exaggerated with artistic grace and warmth.',
      'Modern minimal caricature of {{image_description}}. Flat color blocks, bold confident lines, geometric simplification of features. Contemporary illustration with personality.',
    ],
  },
  {
    id: 'caricature_exaggerated',
    name: 'Caricature Exaggerated',
    category: 'portrait_identity',
    description: 'Bold editorial caricature with dramatic exaggeration',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Bold editorial caricature of {{image_description}}. Extreme exaggeration of most prominent features, dynamic ink strokes, vibrant watercolor splashes. Satirical newspaper illustration style.',
      'Wild exaggerated caricature of {{image_description}}. Oversized head, tiny body, explosive energy lines. Bright neon accent colors against dark background. Street art influence.',
      'Grotesque artistic caricature of {{image_description}}. Masterful distortion of proportions, loose expressive brushwork, raw energy. Fine art caricature tradition.',
    ],
  },
  {
    id: '3d_pixar',
    name: '3D Pixar-like',
    category: 'portrait_identity',
    description: 'Friendly 3D animated character rendering',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      '3D Pixar-style animated character based on {{image_description}}. Smooth plastic skin, oversized expressive eyes, friendly smile. Studio lighting, clean colorful background. High-quality 3D render.',
      '3D animated movie character of {{image_description}}. Stylized proportions with large head and small body. Warm ambient lighting, depth of field. Disney/Pixar aesthetic with rich textures.',
      '3D cartoon portrait of {{image_description}}. Exaggerated but loveable features, subsurface scattering on skin, vibrant color palette. Movie poster quality 3D rendering.',
    ],
  },
  {
    id: '3d_realistic',
    name: '3D Realistic',
    category: 'portrait_identity',
    description: 'Hyperrealistic 3D sculpted portrait',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Hyperrealistic 3D sculpted bust of {{image_description}}. Museum-quality clay render, dramatic side lighting, marble pedestal. Photorealistic skin texture with subsurface scattering.',
      'Realistic 3D character render of {{image_description}}. Unreal Engine quality, volumetric lighting, detailed pore-level skin. Cinematic depth of field on dark background.',
      'Photorealistic 3D portrait of {{image_description}}. Bronze sculpture aesthetic, warm rim lighting, floating in dramatic studio setup. Ultra-detailed micro displacement mapping.',
    ],
  },
  {
    id: 'anime',
    name: 'Anime',
    category: 'portrait_identity',
    description: 'Japanese anime style portrait',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Anime portrait of {{image_description}}. Large sparkling eyes, simplified nose, colorful hair highlights. Soft cel-shading, cherry blossom background. Studio Ghibli inspired warmth.',
      'Dynamic anime character of {{image_description}}. Bold action pose, speed lines, dramatic lighting. Detailed costume design with flowing fabric. Shonen manga energy.',
      'Ethereal anime portrait of {{image_description}}. Soft pastel watercolor effect, dreamy lighting, delicate features. Shoujo manga aesthetic with sparkle effects and flower motifs.',
    ],
  },
  {
    id: 'comic_panel',
    name: 'Comic Panel',
    category: 'portrait_identity',
    description: 'Western comic book panel style',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Marvel comic book style portrait of {{image_description}}. Bold ink outlines, halftone dot shading, primary color palette. Heroic lighting with dramatic shadows. Classic American comic aesthetic.',
      'Indie graphic novel panel of {{image_description}}. Moody cross-hatching, limited muted color palette, noir lighting. Sophisticated visual storytelling. Daniel Clowes influence.',
      'Pop art comic portrait of {{image_description}}. Ben-day dots, speech bubble "POW!", bold black outlines, primary colors. Warhol meets Lichtenstein. Screen-printed aesthetic.',
    ],
  },
  {
    id: 'sticker_pack',
    name: 'Sticker Pack',
    category: 'portrait_identity',
    description: 'Die-cut sticker collection with expressions',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Cute die-cut sticker of {{image_description}}. Chibi proportions, white border, flat bold colors. Happy expression, sparkle accents. Vinyl sticker on white background. Kawaii style.',
      'Cool graffiti sticker of {{image_description}}. Street art aesthetic, spray paint texture, bold outlines. Urban color palette, slight 3D shadow effect. Slap sticker style.',
      'Vintage retro sticker of {{image_description}}. Worn edges, faded 70s colors, halftone texture overlay. Nostalgic badge design with banner text. Americana aesthetic.',
    ],
  },
  {
    id: 'profile_cleanup',
    name: 'Profile Cleanup',
    category: 'portrait_identity',
    description: 'Professional profile photo enhancement',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Professional LinkedIn headshot of {{image_description}}. Clean neutral background, balanced studio lighting, sharp focus on face. Business professional appearance, confident expression. Magazine cover quality.',
      'Creative professional portrait of {{image_description}}. Artistic gradient background, dramatic Rembrandt lighting. Elegant and approachable. Modern executive portrait style.',
      'Casual professional portrait of {{image_description}}. Natural soft daylight, blurred outdoor background. Warm and approachable expression. Editorial lifestyle photography style.',
    ],
  },

  // ═══════════════════════════════════════════
  // DESIGN & BRAND (6 packs)
  // ═══════════════════════════════════════════
  {
    id: 'poster_remix',
    name: 'Poster Remix',
    category: 'design_brand',
    description: 'Concert/movie poster style compositions',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Vintage movie poster featuring {{image_description}}. Bold serif typography, warm golden tones, dramatic lighting. Classic Hollywood composition with film grain texture.',
      'Swiss modernist poster featuring {{image_description}}. Helvetica typography, primary color blocks, geometric grid layout. Clean International Style design.',
      'Psychedelic concert poster of {{image_description}}. Art Nouveau flowing lines, vibrant rainbow gradients, hand-lettered typography. 1960s San Francisco music scene aesthetic.',
    ],
  },
  {
    id: 'album_cover',
    name: 'Album Cover',
    category: 'design_brand',
    description: 'Music album cover art treatments',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Minimalist album cover featuring {{image_description}}. Large negative space, tiny centered figure, single accent color. Atmospheric fog, melancholic mood. Indie album aesthetic.',
      'Hip-hop album cover of {{image_description}}. Bold high-contrast portrait, gold chain accents, dark moody atmosphere. Dramatic upward camera angle. Rap album aesthetic.',
      'Dream pop album cover of {{image_description}}. Double exposure with flowers, soft pastel color wash, ethereal glow. Blurred edges, nostalgic film feel. Shoegaze aesthetic.',
    ],
  },
  {
    id: 'typography_overlay',
    name: 'Typography Overlay',
    category: 'design_brand',
    description: 'Bold type integrated with image',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Magazine cover layout with {{image_description}}. Bold sans-serif title text wrapping around subject, fashion editorial style. High contrast, strong grid layout.',
      'Kinetic typography design with {{image_description}}. Words exploding outward from center, mixed typefaces, energetic layout. Bold neon colors on dark.',
      'Vintage letterpress design with {{image_description}}. Woodblock type overlaid on image, worn texture, limited color palette. Artisan print shop aesthetic.',
    ],
  },
  {
    id: 'packaging_mock',
    name: 'Packaging Mock',
    category: 'design_brand',
    description: 'Product packaging mockup preview',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Premium product box featuring {{image_description}}. Clean white packaging, embossed gold foil logo, minimal layout. Luxury brand unboxing. Studio product photography.',
      'Street food packaging with {{image_description}}. Bold graphic illustration, kraft paper bag, colorful sticker label. Urban food brand aesthetic.',
      'Skincare bottle featuring {{image_description}}. Frosted glass, minimal label, botanical accent illustration. Clean beauty brand. Soft studio lighting.',
    ],
  },
  {
    id: 'brand_stamp',
    name: 'Brand Stamp',
    category: 'design_brand',
    description: 'Logo stamp and badge system',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Vintage circular badge logo featuring {{image_description}}. Distressed texture, rope border, serif typography, two-tone color. Heritage brand aesthetic.',
      'Modern minimal logo stamp of {{image_description}}. Single continuous line, geometric shape, clean sans-serif text. Black on white. Scandinavian design.',
      'Hand-drawn artisan stamp of {{image_description}}. Illustration in a crest shape, hand-lettered text, cross-hatching detail. Craft brewery or bakery aesthetic.',
    ],
  },
  {
    id: 'social_card',
    name: 'Social Card',
    category: 'design_brand',
    description: 'Social media card layouts',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Instagram quote card featuring {{image_description}}. Centered text overlay, gradient color wash, modern sans-serif. Clean social media design.',
      'Twitter announcement card with {{image_description}}. Bold headline, brand color sidebar, minimal icon accents. Professional social media template.',
      'Story slide design of {{image_description}}. Full-bleed image with text panel overlay, rounded corners, swipe indicator. Mobile-first social design.',
    ],
  },

  // ═══════════════════════════════════════════
  // PHOTO TRANSFORMS (8 packs)
  // ═══════════════════════════════════════════
  {
    id: 'cinematic_portrait',
    name: 'Cinematic Portrait',
    category: 'photo_transforms',
    description: 'Movie still quality with dramatic lighting',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Cinematic portrait of {{image_description}}. Anamorphic lens flare, teal and orange color grade, shallow depth of field. 35mm film look, movie still quality.',
      'Noir cinematic portrait of {{image_description}}. Venetian blind shadow pattern, single harsh light source, black and white with blue tint. Film noir atmosphere.',
      'Sci-fi cinematic of {{image_description}}. Blade Runner neon reflections, rain-soaked, volumetric purple and cyan light. Futuristic urban backdrop.',
    ],
  },
  {
    id: 'editorial_fashion',
    name: 'Editorial Fashion',
    category: 'photo_transforms',
    description: 'High fashion editorial photography style',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Vogue editorial of {{image_description}}. High-key beauty lighting, flawless skin, bold eye makeup emphasis. Clean white background, fashion magazine cover quality.',
      'Avant-garde fashion editorial of {{image_description}}. Dramatic sculptural lighting, unusual color palette, geometric set design. High fashion conceptual art.',
      'Street fashion editorial of {{image_description}}. Golden hour urban setting, confident walking pose, candid energy. Designer outfit detail, magazine editorial style.',
    ],
  },
  {
    id: 'street_documentary',
    name: 'Street Documentary',
    category: 'photo_transforms',
    description: 'Raw documentary street photography',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Street documentary of {{image_description}}. Gritty black and white, high contrast, decisive moment. Henri Cartier-Bresson influence. Raw authentic feel.',
      'Color street photo of {{image_description}}. William Eggleston palette, mundane beauty, off-center composition. American New Color Photography style.',
      'Rain-soaked street documentary of {{image_description}}. Wet reflections, ambient city light, motion blur pedestrians. Saul Leiter color and atmosphere.',
    ],
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    category: 'photo_transforms',
    description: 'Authentic instant film aesthetic',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Polaroid instant photo of {{image_description}}. White border frame, slightly faded colors, soft warm cast. Casual snapshot feel, slight vignette.',
      'Overexposed Polaroid of {{image_description}}. Blown highlights, dreamy ethereal feel, light leak on edge. Summer nostalgia, washed out pastels.',
      'Shaken Polaroid of {{image_description}}. Developing in real-time look, partial color emergence, unique chemical artifacts. Experimental instant film.',
    ],
  },
  {
    id: 'film_lab',
    name: 'Film Lab',
    category: 'photo_transforms',
    description: 'Classic film stock emulations',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Kodak Portra 400 photo of {{image_description}}. Warm skin tones, pastel highlights, fine grain. Natural daylight, beautiful bokeh. Medium format film quality.',
      'Fuji Velvia slide film of {{image_description}}. Ultra-saturated colors, deep blacks, punchy contrast. Landscape photography color science. Vivid and dramatic.',
      'Ilford HP5 Plus of {{image_description}}. Classic black and white, beautiful grain structure, wide tonal range. Darkroom silver gelatin print quality.',
    ],
  },
  {
    id: 'vintage_newspaper',
    name: 'Vintage Newspaper',
    category: 'photo_transforms',
    description: 'Aged newspaper photograph look',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Vintage 1920s newspaper photo of {{image_description}}. Sepia tone, heavy halftone dots, yellowed paper texture. Old press photography with caption text below.',
      'WWII era newspaper clipping of {{image_description}}. High contrast black and white, screened halftone, creased paper folds. Historic press photo aesthetic.',
      'Tabloid newspaper photo of {{image_description}}. Grainy, high contrast, slightly blurred. Sensational angle, bold headline overlay. 1970s tabloid press aesthetic.',
    ],
  },
  {
    id: 'highkey_studio',
    name: 'High-Key Studio',
    category: 'photo_transforms',
    description: 'Bright white background studio look',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'High-key beauty portrait of {{image_description}}. Pure white background, even shadowless lighting, luminous skin. Beauty campaign quality.',
      'High-key fashion portrait of {{image_description}}. Bright backlight creating rim glow, clean white cyclorama. Fresh and airy, catalog photography quality.',
      'High-key artistic portrait of {{image_description}}. Overexposed background, ethereal blown highlights, minimal shadow. Fine art photography aesthetic.',
    ],
  },
  {
    id: 'lowkey_studio',
    name: 'Low-Key Studio',
    category: 'photo_transforms',
    description: 'Dark dramatic studio portrait',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Low-key Rembrandt portrait of {{image_description}}. Single light source, dramatic triangle shadow on cheek, deep black background. Old master painting quality.',
      'Low-key split lighting of {{image_description}}. Half face illuminated, half in shadow. High contrast, mysterious mood. Dramatic studio portrait.',
      'Low-key rim light portrait of {{image_description}}. Subject silhouette with thin edge light, moody atmosphere. Cinematic studio setup, minimal fill.',
    ],
  },

  // ═══════════════════════════════════════════
  // CONCEPT (6 packs)
  // ═══════════════════════════════════════════
  {
    id: 'double_exposure',
    name: 'Double Exposure',
    category: 'concept',
    description: 'Portrait merged with nature/cityscape',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Double exposure portrait of {{image_description}} merged with a misty forest. Silhouette filled with trees, birds, and morning fog. Ethereal and meditative. Fine art photography.',
      'Double exposure of {{image_description}} merged with a city skyline at night. Glowing buildings within the portrait silhouette, light trails from cars. Urban energy.',
      'Double exposure of {{image_description}} merged with ocean waves. Crashing surf within the face contours, sea foam and deep blue. Coastal dreamscape.',
    ],
  },
  {
    id: 'neon_silhouette',
    name: 'Neon Silhouette',
    category: 'concept',
    description: 'Glowing neon outline on dark background',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Neon silhouette of {{image_description}}. Hot pink and electric blue neon tube outline on pure black background. Cyberpunk aesthetic, light glow and reflections.',
      'Single-line neon portrait of {{image_description}}. Continuous glowing wire forming the face, warm amber neon on dark blue. Elegant bar sign aesthetic.',
      'Multi-color neon of {{image_description}}. Rainbow gradient neon tubes forming portrait details, vapor wave atmosphere, reflective wet floor. Retro-futuristic.',
    ],
  },
  {
    id: 'clay_render',
    name: 'Clay Render',
    category: 'concept',
    description: 'Matte clay 3D sculpture look',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Matte gray clay render of {{image_description}}. Uniform neutral clay material, soft studio lighting, no texture. Clean 3D modeling showcase on white background.',
      'Warm terracotta clay bust of {{image_description}}. Handmade pottery feel, visible tool marks, earth-tone clay. Artisan sculpture under museum lighting.',
      'White marble clay render of {{image_description}}. Porcelain-smooth finish, cool blue ambient light. Classical sculpture aesthetic, museum pedestal.',
    ],
  },
  {
    id: 'paper_cut',
    name: 'Paper Cut',
    category: 'concept',
    description: 'Layered paper cut-out artwork',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Paper cut portrait of {{image_description}}. Multi-layered colored paper, visible shadows between layers. Handcraft aesthetic, clean edges. Japanese kirigami influence.',
      'Torn paper collage of {{image_description}}. Ripped edges, layered textures, mixed paper types. Raw and expressive. Contemporary art gallery piece.',
      'Origami-style paper portrait of {{image_description}}. Folded paper facets, geometric low-poly look. White paper with dramatic side lighting casting geometric shadows.',
    ],
  },
  {
    id: 'collage_ripout',
    name: 'Collage Rip-Out',
    category: 'concept',
    description: 'Magazine rip-and-paste collage style',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Magazine collage rip-out of {{image_description}}. Torn magazine pages, overlapping layers, ransom-note mixed fonts. Punk zine aesthetic, safety pins and tape.',
      'Elegant fashion collage of {{image_description}}. Carefully cut magazine elements, gold foil accents, vintage fashion plates. Sophisticated scrapbook aesthetic.',
      'Digital glitch collage of {{image_description}}. Corrupted data blocks, scan line artifacts, offset color channels. Contemporary digital collage art.',
    ],
  },
  {
    id: 'city_fill',
    name: 'City Fill Silhouette',
    category: 'concept',
    description: 'Portrait silhouette filled with cityscape',
    cost: COSTS.funlab_3_options,
    prompt_templates: [
      'Head silhouette of {{image_description}} filled with a bustling city aerial view. Tiny cars and buildings inside the outline. Tilt-shift miniature effect.',
      'Profile silhouette of {{image_description}} containing a neon Tokyo street scene. Rain-soaked alley, Japanese signage, colorful umbrellas. Urban density.',
      'Silhouette of {{image_description}} filled with a sunset skyline. Golden hour light, skyscrapers, bridge. Warm gradient sky transitioning to city lights.',
    ],
  },

  // ═══════════════════════════════════════════
  // TYPOGRAPHY & STRUCTURE (6 packs)
  // ═══════════════════════════════════════════
  {
    id: 'text_portrait',
    name: 'Text Portrait',
    category: 'typography_structure',
    description: 'Portrait formed entirely from text characters',
    cost: COSTS.funlab_3_options,
    controls: TYPOGRAPHY_CONTROLS,
    prompt_templates: [
      'Text portrait of {{image_description}} formed entirely from the repeated text "{{user_text}}" in {{text_style}} font. Letters follow the edge contours and shadows of the face. High density text fill at {{density}} coverage. Strong contrast between light and dark areas. Black text on white background.',
      'Full-fill text portrait of {{image_description}} using "{{user_text}}" in {{text_style}} style. Every area of the portrait is filled with text at varying sizes - larger text in highlights, tiny dense text in shadows. {{density}} density, {{contrast}} contrast. Continuous flowing text.',
      'Shadow-mapped text portrait of {{image_description}} created from "{{user_text}}" text. Shadow regions use bold heavy text, midtones use regular weight, highlights are sparse or empty. {{text_style}} typeface, dramatic tonal depth through text weight alone.',
    ],
  },
  {
    id: 'newspaper_portrait',
    name: 'Newspaper',
    category: 'typography_structure',
    description: 'Portrait built from newspaper columns',
    cost: COSTS.funlab_3_options,
    controls: TYPOGRAPHY_CONTROLS,
    prompt_templates: [
      'Newspaper typography portrait of {{image_description}} composed of "{{user_text}}" arranged in newspaper columns. Justified text blocks form the tonal regions. Headlines in dark areas, body text in midtones. Broadsheet newspaper layout with {{text_style}} typeface.',
      'Tabloid portrait of {{image_description}} from "{{user_text}}". Bold mixed-size headlines filling the portrait, screaming tabloid energy. Text at {{density}} density, strong black and white contrast. Newsprint texture.',
      'Classified ad portrait of {{image_description}} made from "{{user_text}}" in tiny classified listing format. Dense grid of small text forming the image. {{text_style}} font, {{density}} density. Yellowed newsprint background.',
    ],
  },
  {
    id: 'mosaic_portrait',
    name: 'Mosaic Portrait',
    category: 'typography_structure',
    description: 'Portrait from tiled text characters',
    cost: COSTS.funlab_3_options,
    controls: TYPOGRAPHY_CONTROLS,
    prompt_templates: [
      'Mosaic portrait of {{image_description}} built from individual letter tiles of "{{user_text}}". Each tile is a single character at {{text_scale}} scale, colored to match the underlying image region. Scrabble-tile aesthetic, {{text_style}} font.',
      'Pixel mosaic portrait of {{image_description}} from "{{user_text}}" characters. Grid-aligned monospace characters, each cell colored. Low-resolution pixel art feel using text. Dense {{density}} grid.',
      'Gradient mosaic of {{image_description}} using "{{user_text}}". Characters transition from light to bold weight across the portrait. Smooth tonal gradient achieved through typography weight. {{text_style}} typeface family.',
    ],
  },
  {
    id: 'scribble_portrait',
    name: 'Handwritten Scribble',
    category: 'typography_structure',
    description: 'Portrait from handwritten scribbled text',
    cost: COSTS.funlab_3_options,
    controls: TYPOGRAPHY_CONTROLS,
    prompt_templates: [
      'Handwritten scribble portrait of {{image_description}} using "{{user_text}}" written repeatedly in loose handwriting. Lines follow face contours, varying pressure creates tone. Ink pen on paper. {{density}} density.',
      'Spiral scribble portrait of {{image_description}} from "{{user_text}}". Continuous spiraling handwritten text starting from center outward, denser in shadows. Single continuous line of text. Calligraphic ink.',
      'Scratchy scribble of {{image_description}} in "{{user_text}}". Aggressive scratchy handwriting, cross-hatching text lines. Raw expressive energy, pencil on paper texture. Artist notebook aesthetic.',
    ],
  },
  {
    id: 'ascii_portrait',
    name: 'ASCII Portrait',
    category: 'typography_structure',
    description: 'Portrait rendered in ASCII art characters',
    cost: COSTS.funlab_3_options,
    controls: TYPOGRAPHY_CONTROLS,
    prompt_templates: [
      'ASCII art portrait of {{image_description}} using characters from "{{user_text}}". Classic terminal green-on-black color scheme. Characters chosen by density: @ # % + - . for tonal range. Monospace font, {{density}} resolution.',
      'Color ASCII portrait of {{image_description}} from "{{user_text}}" characters. Each ASCII character colored to match the image. Modern terminal with syntax highlighting colors. High-resolution character grid.',
      'Typewriter ASCII of {{image_description}} using "{{user_text}}". Ink ribbon aesthetic, slightly uneven character spacing, paper texture. Vintage typewriter ASCII art on cream paper.',
    ],
  },
  {
    id: 'text_shadow_cutout',
    name: 'Text Shadow Cutout',
    category: 'typography_structure',
    description: 'Portrait cut from text shadow layers',
    cost: COSTS.funlab_3_options,
    controls: TYPOGRAPHY_CONTROLS,
    prompt_templates: [
      'Text shadow cutout of {{image_description}}. Large "{{user_text}}" text casting a long shadow that forms the portrait silhouette. {{text_style}} font. Dramatic perspective shadow on flat background. Clean graphic design.',
      'Multi-layer shadow portrait of {{image_description}} from "{{user_text}}". Stacked text layers at different depths, shadows creating dimensional portrait. Paper shadow box effect. {{text_style}} type.',
      'Backlit text cutout of {{image_description}}. "{{user_text}}" letters cut from dark surface, bright light behind reveals portrait through the letter shapes. Stencil effect, {{text_style}} font. Dramatic contrast.',
    ],
  },
];

// Assign category preview images to all packs that don't have a specific one
FUNLAB_PACKS.forEach((pack) => {
  if (!pack.preview_image) {
    pack.preview_image = CATEGORY_PREVIEWS[pack.category];
  }
});

export function getPacksByCategory(category: FunLabCategory): FunLabPack[] {
  return FUNLAB_PACKS.filter((p) => p.category === category);
}

export function getPackById(id: string): FunLabPack | undefined {
  return FUNLAB_PACKS.find((p) => p.id === id);
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}
