/**
 * Crops a token logo image to a square, removing uniform background color.
 * Returns a Promise that resolves to the cropped image element.
 */
export function cropLogoToSquare(
  originalImage: HTMLImageElement, 
  tolerance: number = 10
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      // Check if it's an SVG (by checking file extension in src)
      if (originalImage.src.toLowerCase().endsWith('.svg')) {
        // For SVGs, just return the original image
        resolve(originalImage);
        return;
      }

      // Check if image has valid dimensions
      if (originalImage.width === 0 || originalImage.height === 0) {
        console.warn('Image has no dimensions, returning original image');
        resolve(originalImage);
        return;
      }

      // Create a canvas to work with the image
      const canvas = document.createElement('canvas');
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Could not get 2D context from canvas");
      }
      
      ctx.drawImage(originalImage, 0, 0);
      
      // Get the background color from the top-left pixel
      const bgColorData = ctx.getImageData(0, 0, 1, 1).data;
      
      // Get image data to analyze
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Find boundaries of non-background pixels
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;
      
      // Scan all pixels to find content boundaries
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          if (
            Math.abs(data[idx] - bgColorData[0]) > tolerance ||
            Math.abs(data[idx + 1] - bgColorData[1]) > tolerance ||
            Math.abs(data[idx + 2] - bgColorData[2]) > tolerance
          ) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      
      // If no non-background pixels found, return the original image
      if (minX > maxX || minY > maxY) {
        resolve(originalImage);
        return;
      }
      
      // Calculate dimensions
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const size = Math.max(width, height);
      
      // Create result canvas
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = size;
      resultCanvas.height = size;
      const resultCtx = resultCanvas.getContext('2d');
      
      if (!resultCtx) {
        throw new Error("Could not get 2D context from result canvas");
      }
      
      // Fill with background color
      resultCtx.fillStyle = `rgb(${bgColorData[0]}, ${bgColorData[1]}, ${bgColorData[2]})`;
      resultCtx.fillRect(0, 0, size, size);
      
      // Center the logo
      const offsetX = Math.floor(size/2 - width/2);
      const offsetY = Math.floor(size/2 - height/2);
      
      // Draw the cropped logo
      resultCtx.drawImage(
        originalImage, 
        minX, minY, width, height,
        offsetX, offsetY, width, height
      );

      // Create new image from canvas
      const croppedImage = new Image();
      croppedImage.src = resultCanvas.toDataURL();
      croppedImage.onload = () => resolve(croppedImage);
      croppedImage.onerror = () => reject(new Error("Failed to create cropped image"));
    } catch (err) {
      console.warn('Error in cropLogoToSquare, returning original:', err);
      resolve(originalImage);
    }
  });
}


/**
 * Crops a token logo image to a square, removing uniform background color.
 * Returns a Promise that resolves to the cropped image element.
 */
export function getCanvas(
  originalImage: HTMLImageElement
): HTMLCanvasElement {
  const imgSize = 64
  // Create a canvas to work with the image
  const canvas = document.createElement('canvas');
  // Hack for some SVGs, which have no width or height
  if (originalImage.width === 0 || originalImage.height === 0) {
    canvas.width = imgSize;
    canvas.height = imgSize;
  } else {
    canvas.width = imgSize;
    canvas.height = imgSize;
  }
  let ctx = canvas.getContext('2d');
  
  
  if (!ctx) {
    throw new Error("Could not get 2D context from canvas");
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(originalImage, 0, 0, imgSize, imgSize);
  
  return canvas;
}