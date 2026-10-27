'use client';

import { create } from 'zustand';
import type { Params, PanelSlot, CropRect, ImageAdjust } from './geometry/types';
import { DEFAULT_PARAMS, NEUTRAL_ADJUST } from './geometry/constants';
import { fileToImageData, fileToThumbnailUrl } from './image/loadImage';

export interface SlotData {
  file: File;
  thumbnailUrl: string;
  /** Preview-resolution pixels for live mesh generation. */
  imageData: ImageData;
  /** User-defined crop in normalized [0,1] image coordinates. */
  crop?: CropRect;
  /** This photo's own image adjustments; starts neutral. */
  adjust: ImageAdjust;
}

interface State {
  slots: Partial<Record<PanelSlot, SlotData>>;
  params: Params;
  exploded: number; // 0 = assembled, 1 = fully exploded
  setExploded: (v: number) => void;
  setParams: (patch: Partial<Params>) => void;
  setImage: (slot: PanelSlot, file: File) => Promise<void>;
  removeImage: (slot: PanelSlot) => void;
  setCrop: (slot: PanelSlot, crop: CropRect | undefined) => void;
  setAdjust: (slot: PanelSlot, adjust: ImageAdjust) => void;
  /** Give every photo the same adjustments. */
  setAdjustAll: (adjust: ImageAdjust) => void;
}

export const useStore = create<State>((set, get) => ({
  slots: {},
  params: DEFAULT_PARAMS,
  exploded: 0,
  setExploded: (v) => set({ exploded: v }),
  setParams: (patch) => set({ params: { ...get().params, ...patch } }),
  setImage: async (slot, file) => {
    const [thumbnailUrl, imageData] = await Promise.all([
      fileToThumbnailUrl(file),
      fileToImageData(file, get().params.previewResolution),
    ]);
    set({ slots: { ...get().slots, [slot]: { file, thumbnailUrl, imageData, adjust: NEUTRAL_ADJUST } } });
  },
  removeImage: (slot) => {
    const next = { ...get().slots };
    delete next[slot];
    set({ slots: next });
  },
  setCrop: (slot, crop) => {
    const existing = get().slots[slot];
    if (!existing) return;
    set({ slots: { ...get().slots, [slot]: { ...existing, crop } } });
  },
  setAdjust: (slot, adjust) => {
    const existing = get().slots[slot];
    if (!existing) return;
    set({ slots: { ...get().slots, [slot]: { ...existing, adjust } } });
  },
  setAdjustAll: (adjust) => {
    const slots = { ...get().slots };
    for (const slot of Object.keys(slots) as PanelSlot[]) {
      slots[slot] = { ...slots[slot]!, adjust };
    }
    set({ slots });
  },
}));
