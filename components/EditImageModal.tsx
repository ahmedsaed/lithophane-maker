'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { CropRect, ImageAdjust } from '@/lib/geometry/types';
import { imageDataToHeightMap, cropHeightMap } from '@/lib/image/toHeightmap';
import { Slider, Toggle } from '@/components/Controls';

interface Props {
  /** Face name, for the title. */
  label: string;
  thumbnailUrl: string;
  /** Preview-resolution pixels, used for the live preview. */
  imageData: ImageData;
  initialCrop?: CropRect;
  initialAdjust: ImageAdjust;
  onDone: (crop: CropRect, adjust: ImageAdjust) => void;
  /** Keep this crop, and give every photo these adjustments. */
  onApplyAll: (crop: CropRect, adjust: ImageAdjust) => void;
  onClose: () => void;
}

/** Largest centred square, unless a crop was already chosen. Every face shows a square. */
function computeInitialCrop(imgW: number, imgH: number, initial?: CropRect): CropRect {
  if (initial) return initial;
  const imageAspect = imgW / imgH;
  const cropW = imageAspect > 1 ? 1 / imageAspect : 1.0;
  const cropH = imageAspect > 1 ? 1.0 : imageAspect;
  return { x: (1 - cropW) / 2, y: (1 - cropH) / 2, w: cropW, h: cropH };
}

/**
 * Edit one face's photo: where to crop it, and how to adjust it. The preview
 * shows the cropped image as the panel will render it — brightness after the
 * adjustments, which is what sets the panel's thickness.
 */
export default function EditImageModal({
  label,
  thumbnailUrl,
  imageData,
  initialCrop,
  initialAdjust,
  onDone,
  onApplyAll,
  onClose,
}: Props) {
  const [crop, setCrop] = useState<CropRect>(() =>
    computeInitialCrop(imageData.width, imageData.height, initialCrop),
  );
  const [adjust, setAdjust] = useState<ImageAdjust>(initialAdjust);
  const set = (patch: Partial<ImageAdjust>) => setAdjust((prev) => ({ ...prev, ...patch }));

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // Redraw the preview whenever the crop or an adjustment changes.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const hm = cropHeightMap(imageDataToHeightMap(imageData, adjust), crop);
    canvas.width = hm.width;
    canvas.height = hm.height;
    const out = new ImageData(hm.width, hm.height);
    for (let i = 0; i < hm.data.length; i++) {
      const v = Math.round(Math.max(0, Math.min(1, hm.data[i])) * 255);
      out.data[i * 4] = v;
      out.data[i * 4 + 1] = v;
      out.data[i * 4 + 2] = v;
      out.data[i * 4 + 3] = 255;
    }
    canvas.getContext('2d')?.putImageData(out, 0, 0);
  }, [imageData, adjust, crop]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, cx: crop.x, cy: crop.y };
  }, [crop.x, crop.y]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Read the drag start now: React may run the updater below after a fast
    // pointerup has already cleared dragStart.
    const start = dragStart.current;
    if (!start || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = start.cx + (e.clientX - start.px) / rect.width;
    const y = start.cy + (e.clientY - start.py) / rect.height;
    setCrop((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(1 - prev.w, x)),
      y: Math.max(0, Math.min(1 - prev.h, y)),
    }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStart.current = null;
  }, []);

  // Close on backdrop click (not on content click)
  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="crop-modal-overlay" onClick={onOverlayClick}>
      <div className="edit-modal" role="dialog" aria-label={`Edit ${label} photo`}>
        <h2 className="edit-modal-title">{label} photo</h2>
        <div className="edit-modal-body">
          <div className="edit-modal-crop">
            <p className="crop-modal-hint">Drag the box to choose what shows on the panel</p>
            <div ref={containerRef} className="crop-image-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbnailUrl} alt="Crop source" draggable={false} />
              <div
                className="crop-rect"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            </div>
          </div>

          <div className="edit-modal-adjust">
            <div className="edit-preview">
              <canvas ref={previewRef} aria-label="Panel preview" />
              <p className="field-desc">Panel preview: brighter = thinner, lets more light through.</p>
            </div>
            <Toggle
              label="Auto contrast"
              options={[
                { label: 'Off', value: false },
                { label: 'On', value: true },
              ]}
              value={adjust.autoContrast}
              onChange={(v) => set({ autoContrast: v as boolean })}
              description="Stretches the brightness range to fill the full dark-to-light span. Useful for low-contrast or washed-out photos."
            />
            <Slider
              label="Brightness"
              value={adjust.brightness}
              min={-0.5}
              max={0.5}
              step={0.05}
              onChange={(v) => set({ brightness: v })}
              description="Shifts all brightness values up (+) or down (−). Use to correct over- or under-exposed photos."
            />
            <Slider
              label="Contrast"
              value={adjust.contrast}
              min={0.5}
              max={2.0}
              step={0.05}
              onChange={(v) => set({ contrast: v })}
              description="Values above 1 increase the difference between light and dark areas."
            />
            <Slider
              label="Sharpen"
              value={adjust.sharpen}
              min={0}
              max={2.0}
              step={0.1}
              onChange={(v) => set({ sharpen: v })}
              description="Enhances fine edges and detail. 0 = off. High values may amplify noise."
            />
            <Toggle
              label="Invert brightness"
              options={[
                { label: 'Normal', value: false },
                { label: 'Inverted', value: true },
              ]}
              value={adjust.invert}
              onChange={(v) => set({ invert: v as boolean })}
              description="For photo negatives."
            />
          </div>
        </div>

        <div className="crop-modal-actions">
          <button className="btn" onClick={() => onDone(crop, adjust)}>
            Done
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onApplyAll(crop, adjust)}
            title="Keep this crop, and give every photo these image settings"
          >
            Use settings for all photos
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
