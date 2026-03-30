/**
 * Test script to verify diverse text styles and positions
 * Generates sample sticker images with different styles
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';

// Register fonts
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'NotoSansCJKTC');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', 'NotoSansCJKTCBlack');

const W = 370, H = 320;
const keywords = ['開心', '生氣', '謝謝', '加油', '好棒', '無奈', '哈哈', '愛你', '掰掰', '驚訝'];

const TEXT_STYLES = [
  { fillColors: ['#FF3B30'], strokeColor: '#FFFFFF', strokeWidth: 7, rotation: 0, fontSizeBoost: 1.15 },
  { fillColors: ['#FF9500', '#FFCC00'], strokeColor: '#FFFFFF', strokeWidth: 6, rotation: -5, fontSizeBoost: 1.1 },
  { fillColors: ['#007AFF'], strokeColor: '#FFD60A', strokeWidth: 5, rotation: 0, fontSizeBoost: 1.1 },
  { fillColors: ['#34C759', '#30D158'], strokeColor: '#FFFFFF', strokeWidth: 6, rotation: 3, fontSizeBoost: 1.12 },
  { fillColors: ['#AF52DE', '#FF2D55'], strokeColor: '#FFFFFF', strokeWidth: 6, rotation: -3, fontSizeBoost: 1.1 },
  { fillColors: ['#FFFFFF'], strokeColor: '#333333', strokeWidth: 7, rotation: 0, fontSizeBoost: 1.15 },
  { fillColors: ['#FF2D55', '#FF375F'], strokeColor: '#FFFFFF', strokeWidth: 6, rotation: 5, fontSizeBoost: 1.1 },
  { fillColors: ['#1C1C1E'], strokeColor: '#FF9F0A', strokeWidth: 6, rotation: 0, fontSizeBoost: 1.12 },
  { fillColors: ['#5AC8FA', '#64D2FF'], strokeColor: '#FFFFFF', strokeWidth: 6, rotation: -4, fontSizeBoost: 1.1 },
  { fillColors: ['#FFD60A', '#FFCC00'], strokeColor: '#FF3B30', strokeWidth: 5, rotation: 4, fontSizeBoost: 1.15 },
];

const POSITIONS = ['bottom-center', 'top-center', 'top-right', 'bottom-left', 'bottom-right', 'top-left'];

// Create a grid preview of all styles
const cols = 5, rows = 2;
const gridW = cols * W, gridH = rows * H;
const gridCanvas = createCanvas(gridW, gridH);
const gridCtx = gridCanvas.getContext('2d');

// Checkerboard background
for (let y = 0; y < gridH; y += 16) {
  for (let x = 0; x < gridW; x += 16) {
    gridCtx.fillStyle = ((x / 16 + y / 16) % 2 === 0) ? '#f0f0f0' : '#ffffff';
    gridCtx.fillRect(x, y, 16, 16);
  }
}

for (let i = 0; i < keywords.length; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const offsetX = col * W;
  const offsetY = row * H;

  const style = TEXT_STYLES[i % TEXT_STYLES.length];
  const position = POSITIONS[i % POSITIONS.length];
  const kw = keywords[i];

  // Draw border
  gridCtx.strokeStyle = '#ccc';
  gridCtx.lineWidth = 1;
  gridCtx.strokeRect(offsetX, offsetY, W, H);

  // Draw a placeholder circle for character
  gridCtx.fillStyle = '#e0e0e0';
  gridCtx.beginPath();
  gridCtx.arc(offsetX + W/2, offsetY + H/2, 80, 0, Math.PI * 2);
  gridCtx.fill();
  gridCtx.fillStyle = '#999';
  gridCtx.font = '14px sans-serif';
  gridCtx.textAlign = 'center';
  gridCtx.fillText('角色區域', offsetX + W/2, offsetY + H/2);

  // Calculate text position
  const fontSize = Math.round(40 * (style.fontSizeBoost || 1));
  const margin = 12;
  const halfFont = fontSize / 2;
  let tx, ty, align;
  switch (position) {
    case 'top-center': tx = offsetX + W/2; ty = offsetY + margin + halfFont + 8; align = 'center'; break;
    case 'top-right': tx = offsetX + W - margin - 8; ty = offsetY + margin + halfFont + 8; align = 'right'; break;
    case 'top-left': tx = offsetX + margin + 8; ty = offsetY + margin + halfFont + 8; align = 'left'; break;
    case 'bottom-left': tx = offsetX + margin + 8; ty = offsetY + H - margin - halfFont; align = 'left'; break;
    case 'bottom-right': tx = offsetX + W - margin - 8; ty = offsetY + H - margin - halfFont; align = 'right'; break;
    default: tx = offsetX + W/2; ty = offsetY + H - margin - halfFont; align = 'center'; break;
  }

  gridCtx.save();
  if (style.rotation) {
    gridCtx.translate(tx, ty);
    gridCtx.rotate((style.rotation * Math.PI) / 180);
    gridCtx.translate(-tx, -ty);
  }

  gridCtx.font = `bold ${fontSize}px NotoSansCJKTCBlack, NotoSansCJKTC, sans-serif`;
  gridCtx.textAlign = align;
  gridCtx.textBaseline = 'middle';

  // Stroke
  gridCtx.strokeStyle = style.strokeColor;
  gridCtx.lineWidth = style.strokeWidth;
  gridCtx.lineJoin = 'round';
  gridCtx.strokeText(kw, tx, ty);

  // Fill
  if (style.fillColors.length > 1) {
    const metrics = gridCtx.measureText(kw);
    let gx0, gx1;
    if (align === 'center') { gx0 = tx - metrics.width/2; gx1 = tx + metrics.width/2; }
    else if (align === 'right') { gx0 = tx - metrics.width; gx1 = tx; }
    else { gx0 = tx; gx1 = tx + metrics.width; }
    const grad = gridCtx.createLinearGradient(gx0, ty - fontSize/2, gx1, ty + fontSize/2);
    style.fillColors.forEach((c, j) => grad.addColorStop(j / (style.fillColors.length - 1), c));
    gridCtx.fillStyle = grad;
  } else {
    gridCtx.fillStyle = style.fillColors[0];
  }
  gridCtx.fillText(kw, tx, ty);

  gridCtx.restore();

  // Label
  gridCtx.fillStyle = '#666';
  gridCtx.font = '11px sans-serif';
  gridCtx.textAlign = 'left';
  gridCtx.fillText(`#${i} ${position}`, offsetX + 4, offsetY + 14);
}

const buf = gridCanvas.toBuffer('image/png');
fs.writeFileSync('/home/ubuntu/text_styles_preview.png', buf);
console.log('Preview saved to /home/ubuntu/text_styles_preview.png');
