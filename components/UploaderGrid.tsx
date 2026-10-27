'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { PANEL_SLOTS, type CropRect, type PanelSlot } from '@/lib/geometry/types';
import CropModal from './CropModal';

const LABELS: Record<PanelSlot, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
};

/**
 * Show only the cropped region in the square slot, matching the panel. The crop
 * is a normalized rectangle that is square in pixels, so scaling the image by
 * 1/w × 1/h and shifting it by the crop's origin fills the slot with exactly
 * that region. Without a crop, `object-fit: cover` shows the centre, as the
 * panel does.
 */
function cropStyle(crop: CropRect | undefined): { className?: string; style?: React.CSSProperties } {
  if (!crop) return {};
  return {
    className: 'cropped',
    style: {
      width: `${100 / crop.w}%`,
      height: `${100 / crop.h}%`,
      left: `${(-100 * crop.x) / crop.w}%`,
      top: `${(-100 * crop.y) / crop.h}%`,
    },
  };
}

function Slot({ slot, onCrop }: { slot: PanelSlot; onCrop: (slot: PanelSlot) => void }) {
  const data = useStore((s) => s.slots[slot]);
  const setImage = useStore((s) => s.setImage);
  const removeImage = useStore((s) => s.removeImage);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`slot ${data ? 'filled' : ''}`}
      onClick={() => inputRef.current?.click()}
    >
      {data ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.thumbnailUrl} alt={LABELS[slot]} {...cropStyle(data.crop)} />
          <button
            className="crop-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCrop(slot);
            }}
            aria-label={`Crop ${LABELS[slot]}`}
          >
            Crop
          </button>
          <button
            className="remove"
            onClick={(e) => {
              e.stopPropagation();
              removeImage(slot);
            }}
            aria-label={`Remove ${LABELS[slot]}`}
          >
            ×
          </button>
        </>
      ) : (
        <span>+ {LABELS[slot]}</span>
      )}
      <span className="label">{LABELS[slot]}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void setImage(slot, file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function UploaderGrid() {
  const [cropSlot, setCropSlot] = useState<PanelSlot | null>(null);
  const slots = useStore((s) => s.slots);
  const setCrop = useStore((s) => s.setCrop);

  const openCrop = (slot: PanelSlot) => setCropSlot(slot);
  const closeCrop = () => setCropSlot(null);

  const cropData = cropSlot ? slots[cropSlot] : null;

  // Every face shows a square image window.
  const targetAspect = 1;

  return (
    <>
      <div className="slot-grid">
        {PANEL_SLOTS.map((slot) => (
          <Slot key={slot} slot={slot} onCrop={openCrop} />
        ))}
      </div>

      {cropSlot && cropData && (
        <CropModal
          thumbnailUrl={cropData.thumbnailUrl}
          imgW={cropData.imageData.width}
          imgH={cropData.imageData.height}
          targetAspect={targetAspect}
          initial={cropData.crop}
          onConfirm={(crop) => {
            setCrop(cropSlot, crop);
            closeCrop();
          }}
          onClose={closeCrop}
        />
      )}
    </>
  );
}
