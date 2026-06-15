'use client';

import { create } from 'zustand';
import type { Params, PanelSlot, CropRect } from './geometry/types';
import { DEFAULT_PARAMS } from './geometry/constants';
import { fileToImageData, fileToThumbnailUrl } from './image/loadImage';

export interface SlotData {
  file: File;
  thumbnailUrl: string;
  /** Preview-resolution pixels for live mesh generation. */
  imageData: ImageData;
  /** User-defined crop in normalized [0,1] image coordinates. */
  crop?: CropRect;
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
    set({ slots: { ...get().slots, [slot]: { file, thumbnailUrl, imageData } } });
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
}));
