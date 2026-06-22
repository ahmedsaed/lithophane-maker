'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { PANEL_SLOTS, type PanelSlot } from '@/lib/geometry/types';
import { cubeLayout } from '@/lib/geometry/layout';
import CropModal from './CropModal';

const LABELS: Record<PanelSlot, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
  bottom: 'Bottom',
};

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
          <img src={data.thumbnailUrl} alt={LABELS[slot]} />
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
  const params = useStore((s) => s.params);
  const setCrop = useStore((s) => s.setCrop);

  const openCrop = (slot: PanelSlot) => setCropSlot(slot);
  const closeCrop = () => setCropSlot(null);

  const cropData = cropSlot ? slots[cropSlot] : null;

  const targetAspect = (() => {
    if (!cropSlot) return 1;
    const L = cubeLayout(params);
    if (cropSlot === 'top') return L.topPanelW / L.topPanelD;
    if (cropSlot === 'bottom') return L.bottomPanelW / L.bottomPanelD;
    return L.sidePanelW / L.sidePanelH;
  })();

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
