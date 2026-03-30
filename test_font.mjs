import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';

// Register Noto Sans CJK TC Bold font
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'NotoSansCJKTC');

const canvas = createCanvas(370, 320);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 370, 320);

// Draw text
ctx.fillStyle = '#ff0000';
ctx.font = 'bold 48px NotoSansCJKTC';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// Stroke for outline
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 6;
ctx.strokeText('開心', 185, 280);
ctx.fillText('開心', 185, 280);

const buf = canvas.toBuffer('image/png');
writeFileSync('/home/ubuntu/test_font_output.png', buf);
console.log('Font test image saved!');
