// Capture GPS position (returns coords or null within timeout)
export function getGpsStamp() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const timeout = setTimeout(() => resolve(null), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
          accuracy: Math.round(pos.coords.accuracy)
        });
      },
      () => { clearTimeout(timeout); resolve(null); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

// Resize + stamp photo with timestamp, GPS, and order ID watermark
export async function captureAndStampPhoto(file, orderId, { maxWidth = 800, maxHeight = 600 } = {}) {
  const gps = await getGpsStamp();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; } }
        else { if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; } }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2d context unavailable')); return; }

        // Draw the base image
        ctx.drawImage(img, 0, 0, w, h);

        // ── Watermark bar ──────────────────────────────────────────────────
        const barH = Math.max(32, Math.round(h * 0.07));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
        ctx.fillRect(0, h - barH, w, barH);

        const fontSize = Math.max(10, Math.round(barH * 0.38));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        const midY = h - barH / 2;

        // Timestamp (left)
        const now = new Date();
        const tsLabel = now.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
        ctx.fillText(`⏱ ${tsLabel}`, 8, midY);

        // GPS (center) or "GPS unavailable"
        const gpsLabel = gps
          ? `📍 ${gps.lat}°N  ${gps.lng}°E  ±${gps.accuracy}m`
          : '📍 GPS unavailable';
        const gpsX = Math.round(w * 0.35);
        ctx.fillText(gpsLabel, gpsX, midY);

        // Order ID (right-aligned)
        if (orderId) {
          const idLabel = `#${orderId}`;
          const measured = ctx.measureText(idLabel).width;
          ctx.fillText(idLabel, w - measured - 8, midY);
        }
        // ── End watermark ──────────────────────────────────────────────────

        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
