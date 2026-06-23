import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check, X, PenTool } from 'lucide-react';

export default function SignatureCanvas({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Initialize canvas settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      // Adjust for high resolution displays
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#3b82f6'; // Premium HSL Blue
        ctx.lineWidth = 3;
      }
    };

    resizeCanvas();
    // Re-adjust on resize
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    // Check touch vs mouse
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawing) return;
    
    // We create a temporary canvas to burn a solid background (optional) or export transparent
    // Let's draw it on a white background so it looks like a real signed paper document
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
      const dataUrl = tempCanvas.toDataURL('image/png');
      onSave(dataUrl);
    } else {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="sig-canvas-container">
      <div className="sig-canvas-header">
        <div className="sig-canvas-title">
          <PenTool size={18} className="text-primary" />
          <span>Customer Digital Signature</span>
        </div>
        {onCancel && (
          <button type="button" className="btn-close-sig" onClick={onCancel}>
            <X size={18} />
          </button>
        )}
      </div>
      
      <p className="sig-canvas-instruction">
        Ask the customer to sign inside the box below:
      </p>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="signature-html5-canvas"
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      <div className="sig-canvas-actions">
        <button
          type="button"
          onClick={clear}
          className="btn btn-secondary btn-icon-only"
          title="Clear Signature"
        >
          <Trash2 size={16} />
          <span>Clear</span>
        </button>
        
        <button
          type="button"
          onClick={save}
          disabled={!hasDrawing}
          className="btn btn-primary"
        >
          <Check size={16} />
          <span>Confirm Signature</span>
        </button>
      </div>
    </div>
  );
}
