/**
 * 前端圖片壓縮工具
 * 用 Canvas 把大圖縮到合理大小再上傳（避免 Vercel 4.5MB 限制）
 */

export async function compressImage(
  file: File,
  maxSize = 2048,
  quality = 0.85
): Promise<File> {
  // 如果已經小於 2MB，不壓縮
  if (file.size < 2 * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // 等比縮放到 maxSize
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
          });
          console.log(`壓縮: ${Math.round(file.size/1024)}KB → ${Math.round(compressed.size/1024)}KB (${width}x${height})`);
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}
