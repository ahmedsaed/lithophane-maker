'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { CropRect } from '@/lib/geometry/types';

interface Props {
  thumbnailUrl: string;
  imgW: number;
  imgH: number;
  targetAspect: number;
  initial?: CropRect;
  onConfirm: (crop: CropRect) => void;
  onClose: () => void;
}

function computeInitialCrop(imgW: number, imgH: number, targetAspect: number, initial?: CropRect) {
  if (initial) return initial;
  const imageAspect = imgW / imgH;
  const cropW = imageAspect > targetAspect ? targetAspect / imageAspect : 1.0;
  const cropH = imageAspect > targetAspect ? 1.0 : imageAspect / targetAspect;
  return { x: (1 - cropW) / 2, y: (1 - cropH) / 2, w: cropW, h: cropH };
}

export default function CropModal({
  thumbnailUrl,
  imgW,
  imgH,
  targetAspect,
  initial,
  onConfirm,
  onClose,
}: Props) {
  const [crop, setCrop] = useState<CropRect>(() =>
    computeInitialCrop(imgW, imgH, targetAspect, initial),
  );

  // When props change (e.g. different slot opened), reset crop
  useEffect(() => {
    setCrop(computeInitialCrop(imgW, imgH, targetAspect, initial));
  }, [imgW, imgH, targetAspect, initial]);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ px: number; py: number; cx: number; cy: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, cx: crop.x, cy: crop.y };
  }, [crop.x, crop.y]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.current.px) / rect.width;
    const dy = (e.clientY - dragStart.current.py) / rect.height;
    setCrop((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(1 - prev.w, dragStart.current!.cx + dx)),
      y: Math.max(0, Math.min(1 - prev.h, dragStart.current!.cy + dy)),
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
      <p className="crop-modal-hint">Drag the box to select the crop area</p>
      <div
        ref={containerRef}
        className="crop-image-container"
      >
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
      <div className="crop-modal-actions">
        <button className="btn" onClick={() => onConfirm(crop)}>
          Apply crop
        </button>
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
