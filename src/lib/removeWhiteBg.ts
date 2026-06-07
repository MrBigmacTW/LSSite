import sharp from "sharp";

const WHITE_THRESHOLD = 240;

/**
 * 去白背景（邊緣 Flood-fill 版）
 *
 * 舊做法（greyscale+negate）會把圖案內部的白色（白狗毛、白文字）也一起去掉。
 * 本函式改從圖片四周連通擴散，只去掉與邊緣相連的白色區域；
 * 圖案內部封閉的白色不受影響。
 * 邊緣抗鋸齒像素依亮度套用漸層透明，維持視覺平滑。
 */
export async function removeWhiteBg(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const px = new Uint8Array(data.buffer);
  const visited = new Uint8Array(width * height); // 1 = 判定為背景
  const queue: number[] = [];

  function seed(x: number, y: number) {
    const i = y * width + x;
    if (visited[i]) return;
    const p = i * 4;
    if (
      px[p] >= WHITE_THRESHOLD &&
      px[p + 1] >= WHITE_THRESHOLD &&
      px[p + 2] >= WHITE_THRESHOLD
    ) {
      visited[i] = 1;
      queue.push(i);
    }
  }

  // 四邊播種
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    seed(0, y);
    seed(width - 1, y);
  }

  // BFS 4-connected 擴散
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }

  // 寫入 alpha：背景像素依亮度漸層（抗鋸齒），非背景完全不透明
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    if (visited[i]) {
      const grey = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
      px[p + 3] = Math.max(0, 255 - grey) | 0;
    } else {
      px[p + 3] = 255;
    }
  }

  return sharp(Buffer.from(px.buffer), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}
