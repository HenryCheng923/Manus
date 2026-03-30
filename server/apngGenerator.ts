/**
 * APNG Animation Generator for LINE Animated Stickers
 * Custom APNG assembler with proper loop count support
 * 
 * LINE Animated Sticker Specs:
 * - Size: max 320x270 px (one side must be >= 270px)
 * - Frames: 5-20 per APNG
 * - Play time: MUST be exactly 1, 2, 3, or 4 seconds
 * - Loop: 1-4 times (num_plays in acTL)
 * - File size: < 300KB per file
 * - Total play time (play_time × loops) ≤ 4 seconds
 */
import crc from 'crc';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  LINE_ANIM_STICKER_WIDTH,
  LINE_ANIM_STICKER_HEIGHT,
  APNG_DEFAULT_FRAMES,
  APNG_LOOP_COUNT,
  type AnimationEffect,
  ANIMATION_EFFECTS,
} from '@shared/types';

// Animation config: 8 frames at specific timing to achieve exactly 1 second play time
// With loop count of 4, total = 4 seconds (maximum allowed)
const FRAME_COUNT = APNG_DEFAULT_FRAMES; // 8 frames
// Each frame delay: 1/8 second = 125ms → 8 frames × 125ms = 1000ms = exactly 1 second
const FRAME_DELAY_NUMERATOR = 1;
const FRAME_DELAY_DENOMINATOR = 8; // 1/8 second per frame
const NUM_PLAYS = APNG_LOOP_COUNT; // 4 loops × 1 second = 4 seconds total

interface AnimationTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
}

/**
 * Custom APNG assembler with configurable loop count (num_plays)
 * The node-apng library hardcodes num_plays=0 (infinite), which LINE rejects.
 */
function assembleApng(
  frames: Buffer[],
  delayNumerator: number,
  delayDenominator: number,
  numPlays: number,
): Buffer {
  function findChunk(buffer: Buffer, type: string, offset = 8): Buffer | null {
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

  // acTL chunk - Animation Control
  const actl = Buffer.alloc(20);
  actl.writeUInt32BE(8, 0);           // Length of chunk data
  actl.write('acTL', 4);              // Chunk type
  actl.writeUInt32BE(frames.length, 8); // Number of frames
  actl.writeUInt32BE(numPlays, 12);   // Number of times to loop (LINE requires 1-4)
  actl.writeUInt32BE(crc.crc32(actl.slice(4, 16)), 16); // CRC

  let sequenceNumber = 0;

  const frameChunks = frames.map((data, index) => {
    const ihdr = findChunk(data, 'IHDR');
    if (!ihdr) throw new Error('IHDR chunk not found!');

    // fcTL chunk - Frame Control
    const fctl = Buffer.alloc(38);
    fctl.writeUInt32BE(26, 0);                    // Length of chunk data
    fctl.write('fcTL', 4);                        // Chunk type
    fctl.writeUInt32BE(sequenceNumber++, 8);      // Sequence number
    fctl.writeUInt32BE(ihdr.readUInt32BE(8), 12); // Width
    fctl.writeUInt32BE(ihdr.readUInt32BE(12), 16);// Height
    fctl.writeUInt32BE(0, 20);                    // X offset
    fctl.writeUInt32BE(0, 24);                    // Y offset
    fctl.writeUInt16BE(delayNumerator, 28);       // Frame delay numerator
    fctl.writeUInt16BE(delayDenominator, 30);     // Frame delay denominator
    fctl.writeUInt8(0, 32);                       // Dispose mode (APNG_DISPOSE_OP_NONE)
    fctl.writeUInt8(0, 33);                       // Blend mode (APNG_BLEND_OP_SOURCE)
    fctl.writeUInt32BE(crc.crc32(fctl.slice(4, 34)), 34); // CRC

    // Extract IDAT/fdAT chunks
    let offset = 8;
    const fdats: Buffer[] = [];
    while (true) {
      const idat = findChunk(data, 'IDAT', offset);
      if (!idat) {
        if (offset === 8) throw new Error('No IDAT chunks found!');
        break;
      }
      offset = idat.byteOffset + idat.length;

      if (index === 0) {
        // First frame uses IDAT directly
        fdats.push(idat);
      } else {
        // Subsequent frames convert IDAT to fdAT
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

  // PNG signature
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  // IHDR from first frame
  const ihdr = findChunk(frames[0], 'IHDR');
  if (!ihdr) throw new Error('IHDR chunk not found!');
  // IEND
  const iend = Buffer.from('0000000049454e44ae426082', 'hex');

  return Buffer.concat([signature, ihdr, actl, ...frameChunks, iend]);
}

/**
 * Calculate transform for each frame based on animation effect
 */
function getFrameTransform(effect: AnimationEffect, frameIndex: number, totalFrames: number): AnimationTransform {
  const t = frameIndex / totalFrames; // 0 to ~1
  const pi2 = Math.PI * 2;

  switch (effect) {
    case 'bounce': {
      const y = -Math.abs(Math.sin(t * pi2)) * 20;
      return { translateX: 0, translateY: y, scaleX: 1, scaleY: 1, rotation: 0 };
    }
    case 'shake': {
      const amp = 12 * (1 - t * 0.3);
      const x = Math.sin(t * pi2 * 2) * amp;
      return { translateX: x, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    }
    case 'pulse': {
      const s = 1 + Math.sin(t * pi2) * 0.12;
      return { translateX: 0, translateY: 0, scaleX: s, scaleY: s, rotation: 0 };
    }
    case 'swing': {
      const angle = Math.sin(t * pi2) * 12;
      return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: angle };
    }
    case 'wobble': {
      const x = Math.sin(t * pi2) * 10;
      const angle = Math.sin(t * pi2) * 5;
      return { translateX: x, translateY: 0, scaleX: 1, scaleY: 1, rotation: angle };
    }
    case 'tada': {
      const phase = t * totalFrames;
      let s = 1, angle = 0;
      if (phase < 2) {
        s = 1 + (phase / 2) * 0.15;
        angle = (phase / 2) * 8;
      } else if (phase < 5) {
        const p = (phase - 2) / 3;
        s = 1.15 - p * 0.15;
        angle = Math.sin(p * pi2 * 2) * 8;
      } else {
        s = 1;
        angle = 0;
      }
      return { translateX: 0, translateY: 0, scaleX: s, scaleY: s, rotation: angle };
    }
    case 'rubberBand': {
      const sx = 1 + Math.sin(t * pi2) * 0.15;
      const sy = 1 - Math.sin(t * pi2) * 0.08;
      return { translateX: 0, translateY: 0, scaleX: sx, scaleY: sy, rotation: 0 };
    }
    case 'jello': {
      const sx = 1 + Math.sin(t * pi2 * 1.5) * 0.08;
      const sy = 1 - Math.sin(t * pi2 * 1.5) * 0.08;
      const angle = Math.sin(t * pi2) * 3;
      return { translateX: 0, translateY: 0, scaleX: sx, scaleY: sy, rotation: angle };
    }
    case 'heartbeat': {
      const beat1 = Math.max(0, Math.sin(t * pi2 * 2));
      const beat2 = Math.max(0, Math.sin(t * pi2 * 2 + Math.PI * 0.5));
      const s = 1 + (beat1 * 0.12 + beat2 * 0.06);
      return { translateX: 0, translateY: 0, scaleX: s, scaleY: s, rotation: 0 };
    }
    case 'wave': {
      const y = Math.sin(t * pi2) * 15;
      const angle = Math.sin(t * pi2) * 5;
      return { translateX: 0, translateY: y, scaleX: 1, scaleY: 1, rotation: angle };
    }
    default:
      return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  }
}

/**
 * Generate an APNG animation from a static sticker image buffer
 * Play time: exactly 1 second per loop, 4 loops = 4 seconds total
 */
export async function generateApngFromSticker(
  imageBuffer: Buffer,
  effect: AnimationEffect,
): Promise<Buffer> {
  const img = await loadImage(imageBuffer);
  const W = LINE_ANIM_STICKER_WIDTH;
  const H = LINE_ANIM_STICKER_HEIGHT;

  const frames: Buffer[] = [];

  for (let i = 0; i < FRAME_COUNT; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const transform = getFrameTransform(effect, i, FRAME_COUNT);

    const padding = 6;
    const availW = W - padding * 2;
    const availH = H - padding * 2;
    const scale = Math.min(availW / img.width, availH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const cx = W / 2;
    const cy = H / 2;

    ctx.save();
    ctx.translate(cx + transform.translateX, cy + transform.translateY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    frames.push(Buffer.from(canvas.toBuffer('image/png')));
  }

  // Assemble APNG with proper loop count
  // 8 frames × (1/8 second each) = 1 second per loop
  // 4 loops × 1 second = 4 seconds total (LINE maximum)
  return assembleApng(frames, FRAME_DELAY_NUMERATOR, FRAME_DELAY_DENOMINATOR, NUM_PLAYS);
}

/**
 * Generate animated main.png (240x240 APNG) from a static image
 * Play time: exactly 1 second per loop, 4 loops = 4 seconds total
 */
export async function generateAnimatedMainImage(
  imageBuffer: Buffer,
  effect: AnimationEffect = 'pulse',
): Promise<Buffer> {
  const img = await loadImage(imageBuffer);
  const W = 240;
  const H = 240;

  const frames: Buffer[] = [];
  // Use 8 frames for main image too, same timing as stickers
  const frameCount = FRAME_COUNT;

  for (let i = 0; i < frameCount; i++) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const transform = getFrameTransform(effect, i, frameCount);

    const padding = 8;
    const availW = W - padding * 2;
    const availH = H - padding * 2;
    const scale = Math.min(availW / img.width, availH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const cx = W / 2;
    const cy = H / 2;

    ctx.save();
    ctx.translate(cx + transform.translateX, cy + transform.translateY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    frames.push(Buffer.from(canvas.toBuffer('image/png')));
  }

  // Same timing: 1 second per loop, 4 loops
  return assembleApng(frames, FRAME_DELAY_NUMERATOR, FRAME_DELAY_DENOMINATOR, NUM_PLAYS);
}

/**
 * Pick an animation effect for a sticker based on its index
 * Distributes effects evenly across stickers
 */
export function pickAnimationEffect(stickerIndex: number): AnimationEffect {
  return ANIMATION_EFFECTS[stickerIndex % ANIMATION_EFFECTS.length];
}
