'use client';

import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { PANEL_SLOTS, type PanelSlot } from '@/lib/geometry/types';

const LABELS: Record<PanelSlot, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
};

function Slot({ slot }: { slot: PanelSlot }) {
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
  return (
    <div className="slot-grid">
      {PANEL_SLOTS.map((slot) => (
        <Slot key={slot} slot={slot} />
      ))}
    </div>
  );
}
