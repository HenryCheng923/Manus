/**
 * Test script to verify APNG format compliance with LINE specs
 * Checks: num_plays (loop count) and frame delay timing
 */
import { createCanvas } from '@napi-rs/canvas';
import crc from 'crc';

// Replicate the assembleApng function for testing
function assembleApng(frames, delayNumerator, delayDenominator, numPlays) {
  function findChunk(buffer, type, offset = 8) {
    while (offset < buffer.length) {
      const chunkLength = buffer.readUInt32BE(offset);
      const chunkType = buffer.slice(offset + 4, offset + 8).toString('ascii');
      if (chunkType === type) {
        return buffer.slice(offset, offset + chunkLength + 12);
      }
      offset += 4 + 4 + chunkLength + 4;
    }
    return null;
  }

  const actl = Buffer.alloc(20);
  actl.writeUInt32BE(8, 0);
  actl.write('acTL', 4);
  actl.writeUInt32BE(frames.length, 8);
  actl.writeUInt32BE(numPlays, 12);
  actl.writeUInt32BE(crc.crc32(actl.slice(4, 16)), 16);

  let sequenceNumber = 0;
  const frameChunks = frames.map((data, index) => {
    const ihdr = findChunk(data, 'IHDR');
    if (!ihdr) throw new Error('IHDR chunk not found!');
    const fctl = Buffer.alloc(38);
    fctl.writeUInt32BE(26, 0);
    fctl.write('fcTL', 4);
    fctl.writeUInt32BE(sequenceNumber++, 8);
    fctl.writeUInt32BE(ihdr.readUInt32BE(8), 12);
    fctl.writeUInt32BE(ihdr.readUInt32BE(12), 16);
    fctl.writeUInt32BE(0, 20);
    fctl.writeUInt32BE(0, 24);
    fctl.writeUInt16BE(delayNumerator, 28);
    fctl.writeUInt16BE(delayDenominator, 30);
    fctl.writeUInt8(0, 32);
    fctl.writeUInt8(0, 33);
    fctl.writeUInt32BE(crc.crc32(fctl.slice(4, 34)), 34);

    let offset = 8;
    const fdats = [];
    while (true) {
      const idat = findChunk(data, 'IDAT', offset);
      if (!idat) { if (offset === 8) throw new Error('No IDAT'); break; }
      offset = idat.byteOffset + idat.length;
      if (index === 0) { fdats.push(idat); }
      else {
        const length = idat.length + 4;
        const fdat = Buffer.alloc(length);
        fdat.writeUInt32BE(length - 12, 0);
        fdat.write('fdAT', 4);
        fdat.writeUInt32BE(sequenceNumber++, 8);
        idat.copy(fdat, 12, 8);
        fdat.writeUInt32BE(crc.crc32(fdat.slice(4, length - 4)), length - 4);
        fdats.push(fdat);
      }
    }
    return Buffer.concat([fctl, ...fdats]);
  });

  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  const ihdr = findChunk(frames[0], 'IHDR');
  const iend = Buffer.from('0000000049454e44ae426082', 'hex');
  return Buffer.concat([signature, ihdr, actl, ...frameChunks, iend]);
}

// Parse APNG to verify chunks
function parseApng(buffer) {
  const result = { numFrames: 0, numPlays: 0, frameDelays: [] };
  let offset = 8; // skip PNG signature
  
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.slice(offset + 4, offset + 8).toString('ascii');
    
    if (chunkType === 'acTL') {
      result.numFrames = buffer.readUInt32BE(offset + 8);
      result.numPlays = buffer.readUInt32BE(offset + 12);
    }
    
    if (chunkType === 'fcTL') {
      const numerator = buffer.readUInt16BE(offset + 28);
      const denominator = buffer.readUInt16BE(offset + 30);
      result.frameDelays.push({ numerator, denominator, seconds: numerator / denominator });
    }
    
    offset += 4 + 4 + chunkLength + 4;
  }
  
  return result;
}

// Generate test frames
const FRAME_COUNT = 8;
const frames = [];
for (let i = 0; i < FRAME_COUNT; i++) {
  const canvas = createCanvas(320, 270);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `hsl(${(i / FRAME_COUNT) * 360}, 70%, 60%)`;
  ctx.fillRect(50, 50, 220, 170);
  frames.push(Buffer.from(canvas.toBuffer('image/png')));
}

// Assemble with LINE-compliant settings
const apngBuffer = assembleApng(frames, 1, 8, 4); // 1/8s per frame, 4 loops

// Parse and verify
const parsed = parseApng(apngBuffer);

console.log('=== APNG Format Verification ===');
console.log(`Number of frames: ${parsed.numFrames} (expected: ${FRAME_COUNT})`);
console.log(`Loop count (num_plays): ${parsed.numPlays} (expected: 4, LINE requires 1-4)`);
console.log(`Frame delays:`);
parsed.frameDelays.forEach((d, i) => {
  console.log(`  Frame ${i}: ${d.numerator}/${d.denominator} = ${d.seconds.toFixed(4)}s`);
});

const totalPlayTime = parsed.frameDelays.reduce((sum, d) => sum + d.seconds, 0);
console.log(`\nSingle loop play time: ${totalPlayTime.toFixed(2)}s (LINE requires 1/2/3/4 seconds)`);
console.log(`Total play time: ${(totalPlayTime * parsed.numPlays).toFixed(2)}s (LINE max: 4 seconds)`);
console.log(`File size: ${(apngBuffer.length / 1024).toFixed(1)}KB (LINE max: 300KB)`);

// Validation
const errors = [];
if (parsed.numPlays < 1 || parsed.numPlays > 4) errors.push(`num_plays ${parsed.numPlays} not in 1-4 range`);
if (![1, 2, 3, 4].includes(Math.round(totalPlayTime))) errors.push(`play time ${totalPlayTime}s not 1/2/3/4 seconds`);
if (totalPlayTime * parsed.numPlays > 4.01) errors.push(`total time ${totalPlayTime * parsed.numPlays}s exceeds 4s`);
if (parsed.numFrames < 5 || parsed.numFrames > 20) errors.push(`frame count ${parsed.numFrames} not in 5-20 range`);

if (errors.length === 0) {
  console.log('\n✅ ALL CHECKS PASSED - APNG is LINE compliant!');
} else {
  console.log('\n❌ ERRORS:');
  errors.forEach(e => console.log(`  - ${e}`));
}

import { writeFileSync } from 'fs';
writeFileSync('/home/ubuntu/test_apng_verified.png', apngBuffer);
console.log('\nSaved test APNG to /home/ubuntu/test_apng_verified.png');
