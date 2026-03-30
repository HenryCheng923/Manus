/**
 * Text overlay utility using @napi-rs/canvas
 * Renders Traditional Chinese text on sticker images with diverse styles and positions
 */
import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import { LINE_STICKER_WIDTH, LINE_STICKER_HEIGHT, LINE_MAIN_WIDTH, LINE_MAIN_HEIGHT, LINE_TAB_WIDTH, LINE_TAB_HEIGHT } from '@shared/types';

// Register Noto Sans CJK TC Bold font for Traditional Chinese
const FONT_PATH_BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc';
const FONT_PATH_BLACK = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc';

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  try {
    GlobalFonts.registerFromPath(FONT_PATH_BOLD, 'NotoSansCJKTC');
    GlobalFonts.registerFromPath(FONT_PATH_BLACK, 'NotoSansCJKTCBlack');
    fontsRegistered = true;
  } catch (e) {
    console.warn('[TextOverlay] Font registration failed, using fallback:', e);
  }
}

// ============================================================
// Text Style Presets - diverse visual styles for sticker text
// ============================================================

interface TextStyle {
  fillColors: string[];           // gradient or solid fill colors
  strokeColor: string;            // outline color
  strokeWidth: number;            // outline thickness
  shadowColor?: string;           // drop shadow color
  shadowBlur?: number;            // drop shadow blur radius
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  rotation?: number;              // rotation angle in degrees
  scaleX?: number;                // horizontal stretch
  scaleY?: number;                // vertical stretch
  fontSizeBoost?: number;         // font size multiplier (1.0 = default)
}

const TEXT_STYLES: TextStyle[] = [
  // Style 0: Bold red with white outline - energetic
  {
    fillColors: ['#FF3B30'],
    strokeColor: '#FFFFFF',
    strokeWidth: 7,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 4,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    fontSizeBoost: 1.15,
  },
  // Style 1: Gradient orange-yellow - warm & cheerful
  {
    fillColors: ['#FF9500', '#FFCC00'],
    strokeColor: '#FFFFFF',
    strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowBlur: 3,
    shadowOffsetX: 1,
    shadowOffsetY: 2,
    rotation: -5,
    fontSizeBoost: 1.1,
  },
  // Style 2: Deep blue with yellow outline - cool
  {
    fillColors: ['#007AFF'],
    strokeColor: '#FFD60A',
    strokeWidth: 5,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 3,
    shadowOffsetX: 1,
    shadowOffsetY: 1,
    fontSizeBoost: 1.1,
  },
  // Style 3: Green gradient - nature/positive
  {
    fillColors: ['#34C759', '#30D158'],
    strokeColor: '#FFFFFF',
    strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 4,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    rotation: 3,
    fontSizeBoost: 1.12,
  },
  // Style 4: Purple-pink gradient - cute/playful
  {
    fillColors: ['#AF52DE', '#FF2D55'],
    strokeColor: '#FFFFFF',
    strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowBlur: 4,
    shadowOffsetX: 1,
    shadowOffsetY: 2,
    rotation: -3,
    fontSizeBoost: 1.1,
  },
  // Style 5: White fill with dark outline - classic
  {
    fillColors: ['#FFFFFF'],
    strokeColor: '#333333',
    strokeWidth: 7,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 5,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    fontSizeBoost: 1.15,
  },
  // Style 6: Hot pink - kawaii
  {
    fillColors: ['#FF2D55', '#FF375F'],
    strokeColor: '#FFFFFF',
    strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 3,
    shadowOffsetX: 1,
    shadowOffsetY: 1,
    rotation: 5,
    fontSizeBoost: 1.1,
  },
  // Style 7: Dark with colored outline - bold
  {
    fillColors: ['#1C1C1E'],
    strokeColor: '#FF9F0A',
    strokeWidth: 6,
    shadowColor: 'rgba(255,159,10,0.3)',
    shadowBlur: 6,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    fontSizeBoost: 1.12,
  },
  // Style 8: Teal gradient - fresh
  {
    fillColors: ['#5AC8FA', '#64D2FF'],
    strokeColor: '#FFFFFF',
    strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 4,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    rotation: -4,
    fontSizeBoost: 1.1,
  },
  // Style 9: Yellow with red outline - attention-grabbing
  {
    fillColors: ['#FFD60A', '#FFCC00'],
    strokeColor: '#FF3B30',
    strokeWidth: 5,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 4,
    shadowOffsetX: 1,
    shadowOffsetY: 2,
    rotation: 4,
    fontSizeBoost: 1.15,
  },
];

// ============================================================
// Text Position Presets - diverse placements
// ============================================================

type TextPosition = 'bottom-center' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-left';

const TEXT_POSITIONS: TextPosition[] = [
  'bottom-center',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-right',
  'top-left',
];

function getTextCoordinates(
  position: TextPosition,
  canvasW: number,
  canvasH: number,
  textWidth: number,
  fontSize: number,
): { x: number; y: number; textAlign: CanvasTextAlign } {
  const margin = 12;
  const halfFontSize = fontSize / 2;

  switch (position) {
    case 'top-center':
      return { x: canvasW / 2, y: margin + halfFontSize + 8, textAlign: 'center' };
    case 'top-right':
      return { x: canvasW - margin - 8, y: margin + halfFontSize + 8, textAlign: 'right' };
    case 'top-left':
      return { x: margin + 8, y: margin + halfFontSize + 8, textAlign: 'left' };
    case 'bottom-left':
      return { x: margin + 8, y: canvasH - margin - halfFontSize, textAlign: 'left' };
    case 'bottom-right':
      return { x: canvasW - margin - 8, y: canvasH - margin - halfFontSize, textAlign: 'right' };
    case 'bottom-center':
    default:
      return { x: canvasW / 2, y: canvasH - margin - halfFontSize, textAlign: 'center' };
  }
}

function drawStyledText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
  fontSize: number,
  textAlign: CanvasTextAlign,
) {
  const fontFamily = 'NotoSansCJKTCBlack, NotoSansCJKTC, sans-serif';
  const actualFontSize = Math.round(fontSize * (style.fontSizeBoost || 1.0));
  ctx.font = `bold ${actualFontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';

  ctx.save();

  // Apply rotation
  if (style.rotation) {
    ctx.translate(x, y);
    ctx.rotate((style.rotation * Math.PI) / 180);
    ctx.translate(-x, -y);
  }

  // Apply scale
  if (style.scaleX || style.scaleY) {
    ctx.translate(x, y);
    ctx.scale(style.scaleX || 1, style.scaleY || 1);
    ctx.translate(-x, -y);
  }

  // Apply shadow
  if (style.shadowColor) {
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = style.shadowBlur || 0;
    ctx.shadowOffsetX = style.shadowOffsetX || 0;
    ctx.shadowOffsetY = style.shadowOffsetY || 0;
  }

  // Draw stroke (outline)
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.strokeWidth;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);

  // Reset shadow for fill
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw fill (gradient or solid)
  if (style.fillColors.length > 1) {
    const metrics = ctx.measureText(text);
    let gradientX0: number, gradientX1: number;
    if (textAlign === 'center') {
      gradientX0 = x - metrics.width / 2;
      gradientX1 = x + metrics.width / 2;
    } else if (textAlign === 'right') {
      gradientX0 = x - metrics.width;
      gradientX1 = x;
    } else {
      gradientX0 = x;
      gradientX1 = x + metrics.width;
    }
    const gradient = ctx.createLinearGradient(gradientX0, y - actualFontSize / 2, gradientX1, y + actualFontSize / 2);
    style.fillColors.forEach((color, i) => {
      gradient.addColorStop(i / (style.fillColors.length - 1), color);
    });
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = style.fillColors[0];
  }
  ctx.fillText(text, x, y);

  ctx.restore();
}

/**
 * Add Traditional Chinese text overlay to a sticker image buffer
 * Uses diverse text styles and positions for each sticker
 */
export async function addTextToSticker(
  imageInput: Buffer | string,
  text: string,
  stickerIndex?: number,
  customWidth?: number,
  customHeight?: number,
): Promise<Buffer> {
  ensureFonts();

  const canvasW = customWidth || LINE_STICKER_WIDTH;
  const canvasH = customHeight || LINE_STICKER_HEIGHT;
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  // Load image from buffer or URL
  let img;
  if (Buffer.isBuffer(imageInput)) {
    img = await loadImage(imageInput);
  } else {
    const response = await fetch(imageInput);
    const arrayBuf = await response.arrayBuffer();
    img = await loadImage(Buffer.from(arrayBuf));
  }

  // ====== KEY CHANGE: Character fills the entire canvas ======
  const padding = 8;
  const availableW = canvasW - padding * 2;
  const availableH = canvasH - padding * 2;

  const scale = Math.min(availableW / img.width, availableH / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const drawX = (canvasW - drawWidth) / 2;
  const drawY = (canvasH - drawHeight) / 2;

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  // ====== Diverse text style and position ======
  const idx = stickerIndex ?? Math.floor(Math.random() * 1000);
  const style = TEXT_STYLES[idx % TEXT_STYLES.length];
  const position = TEXT_POSITIONS[idx % TEXT_POSITIONS.length];

  // Dynamic font size based on text length
  let baseFontSize: number;
  if (text.length <= 1) baseFontSize = 44;
  else if (text.length <= 2) baseFontSize = 40;
  else if (text.length <= 3) baseFontSize = 36;
  else if (text.length <= 4) baseFontSize = 32;
  else if (text.length <= 6) baseFontSize = 26;
  else baseFontSize = 22;

  const { x: textX, y: textY, textAlign } = getTextCoordinates(
    position,
    canvasW,
    canvasH,
    0, // will be calculated inside
    baseFontSize,
  );

  drawStyledText(ctx, text, textX, textY, style, baseFontSize, textAlign);

  return Buffer.from(canvas.toBuffer('image/png'));
}

/**
 * Generate main.png (240x240) from a sticker image buffer (already background-removed)
 */
export async function generateMainImage(imageInput: Buffer | string, title?: string): Promise<Buffer> {
  ensureFonts();

  const canvas = createCanvas(LINE_MAIN_WIDTH, LINE_MAIN_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Load image
  let img;
  if (Buffer.isBuffer(imageInput)) {
    img = await loadImage(imageInput);
  } else {
    const response = await fetch(imageInput);
    const arrayBuf = await response.arrayBuffer();
    img = await loadImage(Buffer.from(arrayBuf));
  }

  // Clear canvas (transparent)
  ctx.clearRect(0, 0, LINE_MAIN_WIDTH, LINE_MAIN_HEIGHT);

  // Fit image proportionally - character fills the space
  const padding = 8;
  const availableW = LINE_MAIN_WIDTH - padding * 2;
  const availableH = title ? LINE_MAIN_HEIGHT - padding * 2 - 36 : LINE_MAIN_HEIGHT - padding * 2;
  const scl = Math.min(availableW / img.width, availableH / img.height);
  const drawWidth = img.width * scl;
  const drawHeight = img.height * scl;
  const drawX = (LINE_MAIN_WIDTH - drawWidth) / 2;
  const drawY = title ? (availableH - drawHeight) / 2 + padding : (LINE_MAIN_HEIGHT - drawHeight) / 2;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  // Add title text if provided
  if (title) {
    const fontSize = title.length <= 4 ? 24 : 18;
    const fontFamily = 'NotoSansCJKTCBlack, NotoSansCJKTC, sans-serif';
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const ty = LINE_MAIN_HEIGHT - 22;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(title, LINE_MAIN_WIDTH / 2, ty);

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FF3B30';
    ctx.fillText(title, LINE_MAIN_WIDTH / 2, ty);
  }

  return Buffer.from(canvas.toBuffer('image/png'));
}

/**
 * Generate tab.png (96x74) from a sticker image buffer (already background-removed)
 */
export async function generateTabImage(imageInput: Buffer | string): Promise<Buffer> {
  ensureFonts();

  const canvas = createCanvas(LINE_TAB_WIDTH, LINE_TAB_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Load image
  let img;
  if (Buffer.isBuffer(imageInput)) {
    img = await loadImage(imageInput);
  } else {
    const response = await fetch(imageInput);
    const arrayBuf = await response.arrayBuffer();
    img = await loadImage(Buffer.from(arrayBuf));
  }

  // Clear canvas (transparent)
  ctx.clearRect(0, 0, LINE_TAB_WIDTH, LINE_TAB_HEIGHT);

  // Fit image proportionally with minimal padding
  const padding = 3;
  const availableW = LINE_TAB_WIDTH - padding * 2;
  const availableH = LINE_TAB_HEIGHT - padding * 2;
  const scl = Math.min(availableW / img.width, availableH / img.height);
  const drawWidth = img.width * scl;
  const drawHeight = img.height * scl;
  const drawX = (LINE_TAB_WIDTH - drawWidth) / 2;
  const drawY = (LINE_TAB_HEIGHT - drawHeight) / 2;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  return Buffer.from(canvas.toBuffer('image/png'));
}
