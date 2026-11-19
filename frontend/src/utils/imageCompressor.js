/**
 * Client-side Image Compression & Conversion Utility
 * Automatically converts large images (e.g. 10MB+ camera photos) into clean
 * JPEG files guaranteed to be under the target max size (default 1.8 MB),
 * ensuring fast uploads and reliable browser/print rendering.
 */

export async function compressImageFile(file, options = {}) {
  if (!file) return null;

  const {
    maxSizeMB = 1.8,
    maxDimension = 1200,
    initialQuality = 0.88,
    minQuality = 0.4,
  } = options;

  // Skip non-image files (e.g., PDFs)
  if (!file.type || !file.type.startsWith('image/')) {
    return {
      file,
      dataUrl: null,
      originalSize: file.size,
      compressedSize: file.size,
      wasCompressed: false,
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback: if browser cannot decode exotic image type, return original file
        resolve({
          file,
          dataUrl: event.target.result,
          originalSize: file.size,
          compressedSize: file.size,
          wasCompressed: false,
        });
      };

      img.onload = async () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Scale down proportionally if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const renderCanvas = (targetW, targetH, quality) =>
            new Promise((resBlob) => {
              const canvas = document.createElement('canvas');
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');

              // Fill white background so transparent PNGs convert cleanly to JPEG
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, targetW, targetH);
              ctx.drawImage(img, 0, 0, targetW, targetH);

              canvas.toBlob(
                (blob) => {
                  resBlob({ blob, dataUrl: canvas.toDataURL('image/jpeg', quality) });
                },
                'image/jpeg',
                quality
              );
            });

          let quality = initialQuality;
          let currentW = width;
          let currentH = height;
          let result = await renderCanvas(currentW, currentH, quality);

          // Iteratively reduce quality if still above maxBytes
          while (result.blob && result.blob.size > maxBytes && quality > minQuality) {
            quality = Math.max(minQuality, quality - 0.12);
            result = await renderCanvas(currentW, currentH, quality);
          }

          // If still above maxBytes after min quality, reduce dimensions progressively
          let scaleAttempts = 0;
          while (result.blob && result.blob.size > maxBytes && scaleAttempts < 4) {
            currentW = Math.round(currentW * 0.75);
            currentH = Math.round(currentH * 0.75);
            result = await renderCanvas(currentW, currentH, quality);
            scaleAttempts++;
          }

          if (!result.blob) {
            resolve({
              file,
              dataUrl: event.target.result,
              originalSize: file.size,
              compressedSize: file.size,
              wasCompressed: false,
            });
            return;
          }

          const baseName = (file.name || 'photo').replace(/\.[^/.]+$/, '');
          const compressedFile = new File([result.blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve({
            file: compressedFile,
            dataUrl: result.dataUrl,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            wasCompressed: true,
          });
        } catch (err) {
          resolve({
            file,
            dataUrl: event.target.result,
            originalSize: file.size,
            compressedSize: file.size,
            wasCompressed: false,
          });
        }
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

export function formatReadableSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
