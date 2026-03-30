import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const c = createCanvas(100, 100);
const ctx = c.getContext('2d');
ctx.fillStyle = '#000';
ctx.font = '20px sans-serif';
ctx.fillText('test', 10, 50);
console.log('napi-rs canvas works!');
console.log('Available font families:', GlobalFonts.families.map(f => f.family).slice(0, 10));
