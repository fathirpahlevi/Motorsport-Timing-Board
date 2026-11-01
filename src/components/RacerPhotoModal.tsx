import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Camera,
  AlertCircle,
  Loader2,
  Move,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { RiderResult } from '../types';

interface RacerPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  racer: RiderResult | null;
  racerPos: number | string;
  isManualMode: boolean;
  onSaved: (racerId: string, imageUrl: string) => void;
}

export const RacerPhotoModal: React.FC<RacerPhotoModalProps> = ({
  isOpen,
  onClose,
  racer,
  racerPos,
  isManualMode,
  onSaved,
}) => {
  // Source image data & file
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Transform states: zoom and offset
  const [zoom, setZoom] = useState<number>(1.0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ startMouseX: number; startMouseY: number; startOffsetX: number; startOffsetY: number }>({
    startMouseX: 0,
    startMouseY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGridOverlay, setShowGridOverlay] = useState(true);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Canvas size for interactive crop viewport (square 1:1)
  const CANVAS_SIZE = 360;

  // Reset transforms when image changes or modal opens
  const resetTransform = useCallback(() => {
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedImageSrc(null);
      setImgElement(null);
      setErrorMessage(null);
      resetTransform();
    }
  }, [isOpen, resetTransform]);

  // Load image when selectedImageSrc changes
  useEffect(() => {
    if (!selectedImageSrc) {
      setImgElement(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgElement(img);
      resetTransform();
    };
    img.onerror = () => {
      setErrorMessage('Failed to read image file. Please try another image.');
      setSelectedImageSrc(null);
    };
    img.src = selectedImageSrc;
  }, [selectedImageSrc, resetTransform]);

  // Redraw canvas whenever imgElement, zoom, or offset changes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw background check pattern for transparent images
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (!imgElement) return;

    const nw = imgElement.naturalWidth;
    const nh = imgElement.naturalHeight;
    if (!nw || !nh) return;

    // Strict 1:1 aspect ratio math (NO STRETCHING)
    // baseScale ensures the entire 1:1 square is covered by default
    const baseScale = Math.max(CANVAS_SIZE / nw, CANVAS_SIZE / nh);
    const scale = baseScale * zoom;

    const drawW = nw * scale;
    const drawH = nh * scale;

    const centerX = CANVAS_SIZE / 2 + offset.x;
    const centerY = CANVAS_SIZE / 2 + offset.y;

    const drawX = centerX - drawW / 2;
    const drawY = centerY - drawH / 2;

    ctx.save();
    // Clip strictly to 1:1 square bounds
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.clip();

    // High quality interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(imgElement, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Draw optional rule-of-thirds grid lines
    if (showGridOverlay) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;

      // Thirds
      const third = CANVAS_SIZE / 3;
      ctx.beginPath();
      ctx.moveTo(third, 0);
      ctx.lineTo(third, CANVAS_SIZE);
      ctx.moveTo(third * 2, 0);
      ctx.lineTo(third * 2, CANVAS_SIZE);
      ctx.moveTo(0, third);
      ctx.lineTo(CANVAS_SIZE, third);
      ctx.moveTo(0, third * 2);
      ctx.lineTo(CANVAS_SIZE, third * 2);
      ctx.stroke();

      // Subtle center crosshair
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      const mid = CANVAS_SIZE / 2;
      ctx.beginPath();
      ctx.moveTo(mid - 12, mid);
      ctx.lineTo(mid + 12, mid);
      ctx.moveTo(mid, mid - 12);
      ctx.lineTo(mid, mid + 12);
      ctx.stroke();

      ctx.restore();
    }
  }, [imgElement, zoom, offset, showGridOverlay]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle local file selection
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedImageSrc(result);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected image.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // Drag and drop into modal
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Mouse pan / drag handlers on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsPanning(true);
    dragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning) return;
    const dx = e.clientX - dragStartRef.current.startMouseX;
    const dy = e.clientY - dragStartRef.current.startMouseY;
    setOffset({
      x: dragStartRef.current.startOffsetX + dx,
      y: dragStartRef.current.startOffsetY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch drag support for tablet/mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      dragStartRef.current = {
        startMouseX: e.touches[0].clientX,
        startMouseY: e.touches[0].clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPanning || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.startMouseX;
    const dy = e.touches[0].clientY - dragStartRef.current.startMouseY;
    setOffset({
      x: dragStartRef.current.startOffsetX + dx,
      y: dragStartRef.current.startOffsetY + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  // Mouse wheel zoom on canvas
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(4.0, Math.max(1.0, parseFloat((prev + zoomDelta).toFixed(2)))));
  };

  // Export cropped 1:1 image and upload to server
  const handleSaveAndUpload = async () => {
    if (!imgElement || !racer) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);

      // Create a high-res 600x600 offscreen canvas for crisp export
      const EXPORT_SIZE = 600;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = EXPORT_SIZE;
      exportCanvas.height = EXPORT_SIZE;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not create export canvas');

      const nw = imgElement.naturalWidth;
      const nh = imgElement.naturalHeight;
      const baseScale = Math.max(EXPORT_SIZE / nw, EXPORT_SIZE / nh);
      const scale = baseScale * zoom;

      const drawW = nw * scale;
      const drawH = nh * scale;

      const ratio = EXPORT_SIZE / CANVAS_SIZE;
      const centerX = EXPORT_SIZE / 2 + offset.x * ratio;
      const centerY = EXPORT_SIZE / 2 + offset.y * ratio;

      const drawX = centerX - drawW / 2;
      const drawY = centerY - drawH / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgElement, drawX, drawY, drawW, drawH);

      const exportedBase64 = exportCanvas.toDataURL('image/png');

      const cleanPos = parseInt(String(racerPos), 10) || 1;
      const payload = {
        imageData: exportedBase64,
        isManualMode,
        pos: cleanPos,
        riderId: racer.id,
      };

      const res = await fetch('/api/upload-racer-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server rejected image upload');
      }

      onSaved(racer.id, data.imageUrl);
      onClose();
    } catch (err: any) {
      console.error('[Save Image Error]', err);
      setErrorMessage(err.message || 'Failed to upload photograph');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !racer) return null;

  const targetFilename = isManualMode
    ? `racer-${racerPos}.png`
    : `racer-id-${racer.id}.png`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 animate-in fade-in zoom-in-95 duration-200"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-black uppercase tracking-wider font-mono text-white">
                Racer Photograph (1:1 Cropper)
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs font-bold text-zinc-300">
                #{racer.no} {racer.nam}
              </span>
              <span className="text-zinc-600">•</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                  isManualMode
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                }`}
              >
                {isManualMode
                  ? `Manual Mode: Grid P${racerPos} → ${targetFilename}`
                  : `Live Mode: ID ${racer.id} → ${targetFilename}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)]">
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode Info Notification */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-[11px] font-mono text-zinc-400 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {isManualMode ? (
                <p>
                  <strong className="text-amber-400 font-bold uppercase">Manual Mode Target:</strong> File will be saved as{' '}
                  <code className="text-white bg-zinc-800 px-1 py-0.5 rounded">{targetFilename}</code>. Any existing file is safely archived to{' '}
                  <code className="text-zinc-300">unusedPic/</code> with a timestamp.
                </p>
              ) : (
                <p>
                  <strong className="text-emerald-400 font-bold uppercase">Live Mode Target:</strong> File is linked to Racer ID{' '}
                  <code className="text-white bg-zinc-800 px-1 py-0.5 rounded">{racer.id}</code> as{' '}
                  <code className="text-white bg-zinc-800 px-1 py-0.5 rounded">{targetFilename}</code>. It will stay with this driver even when grid positions change.
                </p>
              )}
            </div>
          </div>

          {!selectedImageSrc ? (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer ${
                isDraggingOver
                  ? 'border-blue-500 bg-blue-950/20 text-blue-300'
                  : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="p-4 rounded-full bg-zinc-800/80 text-blue-400">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white uppercase tracking-wider">
                  Choose Racer Photograph
                </p>
                <p className="text-xs font-mono text-zinc-400">
                  Click to select or drag and drop image here (PNG, JPG, WEBP)
                </p>
              </div>
              <span className="text-[10px] font-mono bg-zinc-800 px-2.5 py-1 rounded text-zinc-400">
                Strict 1:1 square crop with manual centering enabled
              </span>
            </div>
          ) : (
            /* 1:1 Interactive Cropper View */
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
              {/* Cropper Viewport & Canvas */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative w-[360px] h-[360px] rounded-xl overflow-hidden border-2 border-blue-500/80 shadow-[0_0_20px_rgba(37,99,235,0.2)] bg-zinc-950 cursor-grab active:cursor-grabbing select-none"
                  title="Drag image to position. Scroll to zoom."
                >
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_SIZE}
                    height={CANVAS_SIZE}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onWheel={handleWheel}
                    className="w-full h-full block"
                  />

                  {/* Corner indicator badge */}
                  <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30 flex items-center gap-1.5 pointer-events-none">
                    <Move className="w-3 h-3" /> Drag to Center
                  </div>

                  <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono font-bold text-zinc-300 border border-zinc-700 pointer-events-none">
                    1:1 Ratio
                  </div>
                </div>

                {/* Instruction micro-text */}
                <p className="text-[10px] font-mono text-zinc-400 text-center">
                  Drag with mouse/touch to center • Scroll wheel or slider to zoom
                </p>
              </div>

              {/* Cropper Controls & Preview Column */}
              <div className="flex-1 w-full space-y-4">
                {/* Zoom Control Card */}
                <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold font-mono uppercase text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-4 h-4 text-blue-400" /> Zoom Level
                    </span>
                    <span className="text-blue-400">{zoom.toFixed(1)}x</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.max(1.0, parseFloat((prev - 0.1).toFixed(2))))}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-blue-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setZoom((prev) => Math.min(4.0, parseFloat((prev + 0.1).toFixed(2))))}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Recenter & Grid Guides */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={resetTransform}
                      className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" /> Recenter Position
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowGridOverlay((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showGridOverlay ? 'text-blue-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" /> {showGridOverlay ? 'Grid ON' : 'Grid OFF'}
                    </button>
                  </div>
                </div>

                {/* Starting Grid Live Card Preview Mockup */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                    <span>Card Appearance Preview</span>
                    <span className="text-emerald-400">P{racerPos} Starting Grid</span>
                  </div>

                  <div className="relative w-full h-[88px] bg-gradient-to-b from-[#0B0F40] via-[#1C2082] to-black border border-blue-500/40 rounded-lg p-2.5 overflow-hidden flex justify-between items-center">
                    <div className="flex flex-col justify-between h-full z-10 min-w-0 pr-2">
                      <span className="text-2xl font-black italic text-white leading-none">
                        #{racer.no}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-black uppercase text-white truncate leading-tight">
                          {racer.nam}
                        </p>
                        <p className="text-[9px] font-mono text-blue-300 truncate">
                          {racer.cb || 'No Team Assigned'}
                        </p>
                      </div>
                    </div>

                    {/* Preview Thumbnail */}
                    <div className="relative w-16 h-16 rounded-md overflow-hidden border border-blue-400/50 bg-black shrink-0">
                      <canvas
                        ref={(node) => {
                          if (node && canvasRef.current) {
                            const ctx = node.getContext('2d');
                            if (ctx) {
                              ctx.clearRect(0, 0, 64, 64);
                              ctx.drawImage(canvasRef.current, 0, 0, 64, 64);
                            }
                          }
                        }}
                        width={64}
                        height={64}
                        className="w-full h-full block object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Pick different image */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Choose Different Image File
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {selectedImageSrc && (
              <button
                type="button"
                onClick={handleSaveAndUpload}
                disabled={isUploading}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Photo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save & Apply Photograph
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
