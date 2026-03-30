import apng from 'node-apng';
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

// Create 5 test frames with slight differences
const frames = [];
for (let i = 0; i < 5; i++) {
  const canvas = createCanvas(320, 270);
  const ctx = canvas.getContext('2d');
  
  // Transparent background
  ctx.clearRect(0, 0, 320, 270);
  
  // Draw a circle that moves
  ctx.fillStyle = '#00B900';
  ctx.beginPath();
  ctx.arc(160 + Math.sin(i * Math.PI / 2.5) * 50, 135 + Math.cos(i * Math.PI / 2.5) * 30, 40, 0, Math.PI * 2);
  ctx.fill();
  
  // Add text
  ctx.fillStyle = '#333';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Frame ${i + 1}`, 160, 230);
  
  frames.push(canvas.toBuffer('image/png'));
}

console.log(`Created ${frames.length} frames`);

// Assemble APNG
const result = apng(frames, (index) => ({
  numerator: 1,
  denominator: 5, // 5 FPS = each frame 200ms
}));

fs.writeFileSync('/home/ubuntu/test_apng_output.png', result);
console.log('APNG created successfully!');
console.log(`File size: ${result.length} bytes`);
