// js/offscreen.js - DEBUG VERSION

function debugLog(message, data = null) {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(`[${timestamp}] [Offscreen]`, message, data || '');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('=== MESSAGE RECEIVED ===', { action: request.action });
  
  const handleAsyncMessage = async () => {
    try {
      if (request.action === 'stitchImages') {
        debugLog('Starting stitchImages...');
        const result = await stitchImages(request.data);
        debugLog('stitchImages completed', { 
          resultLength: result?.length,
          startsWithData: result?.startsWith('data:image')
        });
        sendResponse({ success: true, data: result });
        
      } else if (request.action === 'cropImage') {
        debugLog('Starting cropImage...');
        const result = await cropImage(request.data);
        debugLog('cropImage completed', { resultLength: result?.length });
        sendResponse({ success: true, data: result });
      }
    } catch (error) {
      debugLog('ERROR:', error.message);
      debugLog('Stack:', error.stack);
      sendResponse({ success: false, error: error.message });
    }
  };

  if (request.action === 'stitchImages' || request.action === 'cropImage') {
    handleAsyncMessage();
    return true;
  }
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

async function loadImage(url) {
  debugLog('Loading image...', { urlLength: url?.length });
  try {
    const response = await fetch(url);
    debugLog('Fetch response:', { ok: response.ok, status: response.status });
    
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    
    const blob = await response.blob();
    debugLog('Blob received:', { size: blob.size, type: blob.type });
    
    if (blob.size === 0) {
      throw new Error("Empty blob");
    }
    
    const bitmap = await createImageBitmap(blob);
    debugLog('Bitmap created:', { width: bitmap.width, height: bitmap.height });
    
    return bitmap;
  } catch (error) {
    debugLog('loadImage FAILED:', error.message);
    throw error;
  }
}

function blobToDataURL(blob) {
  debugLog('Converting blob to data URL...', { size: blob.size });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      debugLog('Data URL created:', { length: reader.result.length });
      resolve(reader.result);
    };
    reader.onerror = () => {
      debugLog('FileReader FAILED:', reader.error);
      reject(reader.error);
    };
    reader.readAsDataURL(blob);
  });
}

// ========================================
// CROP IMAGE
// ========================================

async function cropImage({ dataUrl, cropConfig, compress = true }) {
  debugLog('cropImage called', cropConfig);
  
  const { x, y, width, height, devicePixelRatio } = cropConfig;
  
  const img = await loadImage(dataUrl);
  const canvasWidth = width * devicePixelRatio;
  const canvasHeight = height * devicePixelRatio;
  
  debugLog('Canvas dimensions', { 
    width: canvasWidth, 
    height: canvasHeight,
    totalPixels: (canvasWidth * canvasHeight / 1000000).toFixed(2) + 'M'
  });
  
  // Kiểm tra kích thước canvas - nếu quá lớn, cần resize
  const maxCanvasDimension = 8192; // Giới hạn của nhiều browser
  let finalWidth = canvasWidth;
  let finalHeight = canvasHeight;
  let scale = 1;
  
  if (canvasWidth > maxCanvasDimension || canvasHeight > maxCanvasDimension) {
    const scaleX = maxCanvasDimension / canvasWidth;
    const scaleY = maxCanvasDimension / canvasHeight;
    scale = Math.min(scaleX, scaleY);
    finalWidth = Math.floor(canvasWidth * scale);
    finalHeight = Math.floor(canvasHeight * scale);
    debugLog('Canvas too large, scaling down', { 
      original: { width: canvasWidth, height: canvasHeight },
      scaled: { width: finalWidth, height: finalHeight },
      scale: scale.toFixed(3)
    });
  }
  
  const canvas = new OffscreenCanvas(finalWidth, finalHeight);
  const ctx = canvas.getContext('2d');
  
  // Nếu đã scale, vẽ với scale factor
  if (scale < 1) {
    ctx.drawImage(
      img,
      x * devicePixelRatio, 
      y * devicePixelRatio,
      width * devicePixelRatio, 
      height * devicePixelRatio,
      0, 0,
      finalWidth, 
      finalHeight
    );
  } else {
    ctx.drawImage(
      img,
      x * devicePixelRatio, 
      y * devicePixelRatio,
      width * devicePixelRatio, 
      height * devicePixelRatio,
      0, 0,
      canvasWidth, 
      canvasHeight
    );
  }
  
  // Điều chỉnh quality dựa trên kích thước canvas
  let blobQuality = compress ? 0.85 : undefined;
  if (finalWidth * finalHeight > 4000000) { // > 4MP
    blobQuality = 0.75; // Giảm quality cho ảnh lớn
    debugLog('Large image detected, using lower quality', { quality: blobQuality });
  }
  
  // Nén ảnh sang JPEG để giảm kích thước (đặc biệt quan trọng khi lưu vào storage)
  // Chỉ dùng PNG nếu compress = false
  const blobType = compress ? 'image/jpeg' : 'image/png';
  
  const blob = await canvas.convertToBlob({ 
    type: blobType,
    quality: blobQuality
  });
  if (!blob) throw new Error("Blob conversion failed");
  
  const blobSizeMB = blob.size / 1024 / 1024;
  debugLog('Image cropped and compressed', { 
    type: blobType, 
    size: blob.size,
    sizeKB: (blob.size / 1024).toFixed(2),
    sizeMB: blobSizeMB.toFixed(2),
    dimensions: { width: finalWidth, height: finalHeight }
  });
  
  // Kiểm tra nếu blob quá lớn (>20MB), thử compress lại với quality thấp hơn
  if (blobSizeMB > 20 && compress) {
    debugLog('Blob still too large, trying more aggressive compression...');
    const smallerBlob = await canvas.convertToBlob({ 
      type: 'image/jpeg',
      quality: 0.6
    });
    if (smallerBlob && smallerBlob.size < blob.size) {
      debugLog('Re-compressed successfully', { 
        originalMB: blobSizeMB.toFixed(2),
        newMB: (smallerBlob.size / 1024 / 1024).toFixed(2)
      });
      return await blobToDataURL(smallerBlob);
    }
  }
  
  return await blobToDataURL(blob);
}

// ========================================
// STITCH IMAGES
// ========================================

async function stitchImages({ imageURIs, totalWidth, totalHeight, viewHeight }) {
  debugLog('=== STITCH START ===');
  debugLog('Input params:', {
    imageCount: imageURIs?.length,
    totalWidth,
    totalHeight,
    viewHeight
  });

  // Validate
  if (!imageURIs || imageURIs.length === 0) {
    throw new Error("No images provided");
  }
  if (!totalWidth || !totalHeight || !viewHeight) {
    throw new Error(`Invalid dimensions: ${totalWidth}x${totalHeight}, vh: ${viewHeight}`);
  }

  try {
    // Load first image
    debugLog('Loading first image...');
    const firstImage = await loadImage(imageURIs[0]);
    debugLog('First image loaded:', { 
      width: firstImage.width, 
      height: firstImage.height 
    });

    // Calculate DPR
    const dpr = firstImage.width / totalWidth;
    debugLog('DPR calculated:', dpr);

    if (dpr <= 0 || dpr > 10) {
      throw new Error(`Invalid DPR: ${dpr}`);
    }

    // Canvas dimensions
    const canvasWidth = firstImage.width;
    const canvasHeight = Math.round(totalHeight * dpr);
    const viewHeightScaled = Math.round(viewHeight * dpr);

    debugLog('Canvas dimensions:', {
      width: canvasWidth,
      height: canvasHeight,
      viewHeightScaled
    });

    // Check limits
    const MAX = 32767;
    if (canvasWidth > MAX || canvasHeight > MAX) {
      throw new Error(`Canvas too large: ${canvasWidth}x${canvasHeight}`);
    }

    // Create canvas
    debugLog('Creating canvas...');
    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Fill white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    debugLog('Canvas created and filled');

    // Draw images
    let currentY = 0;
    for (let i = 0; i < imageURIs.length; i++) {
      debugLog(`Processing image ${i + 1}/${imageURIs.length}...`);
      
      const img = await loadImage(imageURIs[i]);
      debugLog(`Image ${i + 1} loaded:`, { 
        width: img.width, 
        height: img.height,
        drawAtY: currentY
      });

      if (currentY >= canvasHeight) {
        debugLog(`Stopped at image ${i + 1} (reached canvas height)`);
        break;
      }

      let drawHeight = img.height;
      if (currentY + drawHeight > canvasHeight) {
        drawHeight = canvasHeight - currentY;
        debugLog(`Clipping to height: ${drawHeight}`);
      }

      if (drawHeight > 0) {
        ctx.drawImage(
          img,
          0, 0, img.width, drawHeight,
          0, currentY, canvasWidth, drawHeight
        );
        debugLog(`Image ${i + 1} drawn`);
      }

      currentY += viewHeightScaled;
      debugLog(`Next Y position: ${currentY}`);
    }

    // Convert to blob
    debugLog('Converting canvas to blob...');
    const blob = await canvas.convertToBlob({ 
      type: 'image/png',
      quality: 0.92
    });
    
    if (!blob || blob.size === 0) {
      throw new Error("Blob conversion failed or empty");
    }

    debugLog('Blob created:', { 
      size: blob.size,
      sizeMB: (blob.size / 1024 / 1024).toFixed(2)
    });

    // Convert to data URL
    debugLog('Converting blob to data URL...');
    const dataURL = await blobToDataURL(blob);
    
    if (!dataURL || !dataURL.startsWith('data:image')) {
      throw new Error("Invalid data URL");
    }

    debugLog('=== STITCH SUCCESS ===', {
      dataURLLength: dataURL.length,
      preview: dataURL.substring(0, 50)
    });

    return dataURL;

  } catch (error) {
    debugLog('=== STITCH FAILED ===');
    debugLog('Error:', error.message);
    debugLog('Stack:', error.stack);
    throw error;
  }
}