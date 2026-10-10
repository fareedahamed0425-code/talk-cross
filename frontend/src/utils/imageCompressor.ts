/**
 * Adaptive Image Compressor
 * Compresses any user-selected image down to ~50KB (<= 52KB)
 * while preserving visual clarity, sharpness, and color accuracy.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionPercentage: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Compresses an image file to ~50KB using Canvas + WebP / JPEG adaptive binary quality stepping.
 */
export async function compressImageTo50KB(file: File): Promise<CompressionResult> {
  const originalSizeBytes = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into canvas'));

      img.onload = () => {
        try {
          // 1. Initial sensible dimension bounds (max 1280px is crisp HD for backgrounds)
          let targetWidth = img.width;
          let targetHeight = img.height;
          const maxInitialDim = 1280;

          if (targetWidth > maxInitialDim || targetHeight > maxInitialDim) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxInitialDim) / targetWidth);
              targetWidth = maxInitialDim;
            } else {
              targetWidth = Math.round((targetWidth * maxInitialDim) / targetHeight);
              targetHeight = maxInitialDim;
            }
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false });

          if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
          }

          // Enable high-quality bicubic downscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Target ~50KB (approx 51,200 bytes). Base64 string is ~4/3 larger than raw binary.
          // 52,000 bytes raw binary ≈ 69,333 base64 characters.
          const TARGET_MAX_BYTES = 52 * 1024; // 53,248 bytes
          const TARGET_MIN_BYTES = 30 * 1024; // 30,720 bytes

          const mimeType = 'image/webp'; // WebP achieves superior visual fidelity at low byte budgets

          let currentQuality = 0.82;
          let currentWidth = targetWidth;
          let currentHeight = targetHeight;
          let bestDataUrl = '';
          let bestSizeBytes = Infinity;

          // Helper to calculate raw byte size from Data URL
          const getByteSize = (dataUrlStr: string): number => {
            const base64Index = dataUrlStr.indexOf(',');
            if (base64Index === -1) return dataUrlStr.length;
            const b64Length = dataUrlStr.length - base64Index - 1;
            return Math.round(b64Length * 0.75);
          };

          // Stepwise optimization loop (max 12 iterations for speed and smoothness)
          for (let iter = 0; iter < 12; iter++) {
            canvas.width = currentWidth;
            canvas.height = currentHeight;

            // Re-apply smoothing settings after canvas resize
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

            // Attempt WebP, fallback to JPEG if browser does not produce webp
            let dataUrl = canvas.toDataURL(mimeType, currentQuality);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            }

            const sizeBytes = getByteSize(dataUrl);

            // Keep the best version that is closest to 50KB without exceeding target excessively
            if (sizeBytes <= TARGET_MAX_BYTES) {
              bestDataUrl = dataUrl;
              bestSizeBytes = sizeBytes;
              // If within ideal 32KB - 52KB window, break early to maintain maximum visual clarity
              if (sizeBytes >= TARGET_MIN_BYTES) {
                break;
              }
              // If smaller than min, quality was reduced slightly too much, stop here
              break;
            }

            bestDataUrl = dataUrl;
            bestSizeBytes = sizeBytes;

            // Step down quality or scale down if still too large
            if (currentQuality > 0.45) {
              currentQuality = Math.max(0.40, currentQuality - 0.12);
            } else {
              // Scale resolution down by 15% and reset quality to 0.75 for better detail retention
              currentWidth = Math.round(currentWidth * 0.85);
              currentHeight = Math.round(currentHeight * 0.85);
              currentQuality = 0.75;
            }
          }

          const reductionPercentage = Math.max(
            0,
            Math.round(((originalSizeBytes - bestSizeBytes) / originalSizeBytes) * 100)
          );

          resolve({
            dataUrl: bestDataUrl,
            originalSizeBytes,
            compressedSizeBytes: bestSizeBytes,
            reductionPercentage,
            width: currentWidth,
            height: currentHeight,
            mimeType: bestDataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg',
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
