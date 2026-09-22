/**
 * Browser-native image compression utility using HTML5 Canvas.
 * Compresses raw high-resolution phone photos/screenshots (3MB-10MB)
 * down to ~80KB-180KB while maintaining sharp text legibility for UTRs and timestamps.
 *
 * @param {File} file - The image file from input[type="file"]
 * @param {Object} options - { maxWidth, maxHeight, quality }
 * @returns {Promise<{ dataUrl: string, originalSize: number, compressedSize: number }>}
 */
export function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.78,
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for processing.'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate scaled dimensions while preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback if canvas context fails
          return resolve({
            dataUrl: e.target.result,
            originalSize,
            compressedSize: originalSize,
          });
        }

        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and compress to JPEG
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Approximate size of base64 dataUrl in bytes
        const head = 'data:image/jpeg;base64,';
        const base64Length = dataUrl.length - head.length;
        const compressedSize = Math.round((base64Length * 3) / 4);

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
        });
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to readable string (e.g. 2.4 MB, 120 KB)
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
