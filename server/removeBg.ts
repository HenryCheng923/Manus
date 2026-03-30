/**
 * Server-side background removal using @napi-rs/canvas
 * Removes background from AI-generated sticker images so they are transparent from the start
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * Remove background from an image buffer using flood-fill from edges (smart mode)
 * This ensures the generated sticker has a transparent background
 */
export async function removeBackgroundFromBuffer(imageBuffer: Buffer, options?: {
  tolerance?: number;
  smoothing?: number;
}): Promise<Buffer> {
  const tolerance = options?.tolerance ?? 30;
  const smoothing = options?.smoothing ?? 4;

  const img = await loadImage(imageBuffer);
  const width = img.width;
  const height = img.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Sample background color from corners
  const corners = [
    0,                                    // top-left
    (width - 1) * 4,                      // top-right
    (height - 1) * width * 4,             // bottom-left
    ((height - 1) * width + (width - 1)) * 4, // bottom-right
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  for (const idx of corners) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  const tolValue = (tolerance / 100) * 255;

  const isBg = (r: number, g: number, b: number) =>
    Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2) <= tolValue;

  // Flood-fill from edges (smart connected mode) - preserves internal white areas like eyes
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed all edge pixels
  for (let x = 0; x < width; x++) {
    const top = x;
    const bottom = (height - 1) * width + x;
    queue.push(top); visited[top] = 1;
    queue.push(bottom); visited[bottom] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (!visited[left]) { queue.push(left); visited[left] = 1; }
    if (!visited[right]) { queue.push(right); visited[right] = 1; }
  }

  // BFS flood fill
  while (queue.length > 0) {
    const px = queue.shift()!;
    const idx = px * 4;

    if (isBg(data[idx], data[idx + 1], data[idx + 2])) {
      data[idx + 3] = 0; // Make transparent

      const x = px % width;
      const y = Math.floor(px / width);

      const neighbors = [
        y > 0 ? px - width : -1,           // up
        y < height - 1 ? px + width : -1,  // down
        x > 0 ? px - 1 : -1,               // left
        x < width - 1 ? px + 1 : -1,       // right
      ];

      for (const n of neighbors) {
        if (n >= 0 && !visited[n]) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  // Edge smoothing
  if (smoothing > 0) {
    const alphaMap = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      alphaMap[i] = data[i * 4 + 3];
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (alphaMap[idx] === 0) continue;

        // Check if this pixel is on the edge (adjacent to a transparent pixel)
        let isEdge = false;
        for (let dy = -1; dy <= 1 && !isEdge; dy++) {
          for (let dx = -1; dx <= 1 && !isEdge; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (alphaMap[ny * width + nx] === 0) isEdge = true;
            }
          }
        }

        if (isEdge) {
          // Calculate distance to nearest transparent pixel
          let minDist = smoothing;
          for (let dy = -smoothing; dy <= smoothing; dy++) {
            for (let dx = -smoothing; dx <= smoothing; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (alphaMap[ny * width + nx] === 0) {
                  minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
                }
              }
            }
          }
          data[idx * 4 + 3] = Math.round(alphaMap[idx] * Math.min(1, minDist / smoothing));
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return Buffer.from(canvas.toBuffer('image/png'));
}

/**
 * Remove background from an image URL
 */
export async function removeBackgroundFromUrl(imageUrl: string, options?: {
  tolerance?: number;
  smoothing?: number;
}): Promise<Buffer> {
  const response = await fetch(imageUrl);
  const arrayBuf = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  return removeBackgroundFromBuffer(buffer, options);
}
