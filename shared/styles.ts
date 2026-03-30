/**
 * 貼圖風格定義
 * 每種風格包含名稱、描述、AI prompt 片段
 */

export interface StickerStyle {
  id: string;
  name: string;        // 繁體中文名稱
  description: string; // 繁體中文描述
  promptStyle: string; // 英文 AI prompt 風格描述
  emoji: string;       // 代表 emoji
}

export const STICKER_STYLES: StickerStyle[] = [
  {
    id: "kawaii",
    name: "Q版可愛",
    description: "圓潤可愛的 Q 版角色，大眼睛、小身體",
    promptStyle: "cute chibi/kawaii style with big round eyes, small body, round proportions, adorable and charming, colorful hand-drawn illustration with bold clean outlines, vibrant colors, and exaggerated cute facial expressions",
    emoji: "🥰",
  },
  {
    id: "watercolor",
    name: "水彩風格",
    description: "柔和水彩畫風，色彩暈染自然",
    promptStyle: "beautiful watercolor painting style with soft color washes, gentle gradients, delicate brushstrokes, transparent layers of color bleeding into each other, artistic and dreamy watercolor illustration",
    emoji: "🎨",
  },
  {
    id: "pixel",
    name: "像素風格",
    description: "復古像素遊戲風，8-bit 懷舊感",
    promptStyle: "retro pixel art style, 8-bit game aesthetic, blocky pixels, limited color palette, nostalgic video game character design, clean pixel grid, crisp edges",
    emoji: "👾",
  },
  {
    id: "anime",
    name: "日系動漫",
    description: "日本動漫風格，精緻線條和大眼睛",
    promptStyle: "Japanese anime/manga style illustration with detailed linework, large expressive anime eyes, dynamic poses, cel-shading coloring technique, clean and polished anime art style",
    emoji: "✨",
  },
  {
    id: "sketch",
    name: "手繪素描",
    description: "鉛筆手繪風格，自然隨性的線條",
    promptStyle: "hand-drawn pencil sketch style with natural rough lines, cross-hatching shading, artistic pencil texture, casual and spontaneous drawing feel, black and white with subtle gray tones",
    emoji: "✏️",
  },
  {
    id: "retro-comic",
    name: "復古漫畫",
    description: "美式復古漫畫風，半色調網點效果",
    promptStyle: "retro pop art comic book style with bold outlines, halftone dot patterns, Ben-Day dots, vintage comic coloring, speech bubble aesthetic, 1960s pop art influence",
    emoji: "💥",
  },
  {
    id: "flat",
    name: "扁平設計",
    description: "現代扁平風格，簡潔幾何色塊",
    promptStyle: "modern flat design illustration style with clean geometric shapes, bold solid colors, minimal shadows, simple and clean vector-like aesthetic, contemporary graphic design",
    emoji: "🔷",
  },
  {
    id: "3d-render",
    name: "3D 立體",
    description: "3D 渲染風格，立體感強烈",
    promptStyle: "3D rendered character style with smooth surfaces, soft lighting, subtle shadows, clay-like material, Pixar/Disney 3D animation aesthetic, volumetric and dimensional",
    emoji: "🧊",
  },
  {
    id: "oil-painting",
    name: "油畫風格",
    description: "經典油畫質感，厚重筆觸和色彩",
    promptStyle: "classical oil painting style with thick impasto brushstrokes, rich and deep colors, painterly texture, artistic oil paint on canvas feel, warm and expressive",
    emoji: "🖼️",
  },
  {
    id: "neon",
    name: "霓虹風格",
    description: "霓虹燈光效果，炫彩發光感",
    promptStyle: "neon glow art style with bright glowing outlines, vibrant neon colors on dark background, electric and luminous effect, cyberpunk neon sign aesthetic, glowing edges",
    emoji: "💡",
  },
  {
    id: "minimal-line",
    name: "極簡線條",
    description: "極簡主義線條畫，一筆成形",
    promptStyle: "minimalist single continuous line art style, simple elegant linework, clean and minimal illustration with very few strokes, sophisticated simplicity, thin black lines on white",
    emoji: "〰️",
  },
  {
    id: "doodle",
    name: "塗鴉風格",
    description: "隨性塗鴉風，充滿童趣和活力",
    promptStyle: "playful doodle art style with casual hand-drawn lines, fun and whimsical scribbles, colorful and energetic, childlike creativity, marker pen and crayon texture",
    emoji: "🖍️",
  },
];

/** 根據 style ID 取得風格定義 */
export function getStyleById(styleId: string): StickerStyle | undefined {
  return STICKER_STYLES.find(s => s.id === styleId);
}

/** 取得預設風格 (Q版可愛) */
export const DEFAULT_STYLE_ID = "kawaii";
