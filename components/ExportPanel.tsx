'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { fileToImageData } from '@/lib/image/loadImage';
import { imageDataToHeightMap } from '@/lib/image/toHeightmap';
import { exportPartsZip } from '@/lib/export/exportZip';
import type { HeightMap, PanelSlot } from '@/lib/geometry/types';

export default function ExportPanel() {
  const slots = useStore((s) => s.slots);
  const params = useStore((s) => s.params);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const count = Object.keys(slots).length;

  const onExport = async () => {
    setBusy(true);
    setStatus('Decoding images at export resolution…');
    try {
      const heightMaps: Partial<Record<PanelSlot, HeightMap>> = {};
      for (const slot of Object.keys(slots) as PanelSlot[]) {
        const d = slots[slot];
        if (!d) continue;
        const img = await fileToImageData(d.file, params.exportResolution);
        heightMaps[slot] = imageDataToHeightMap(img, params.invert);
      }
      await exportPartsZip(heightMaps, params, setStatus);
      setStatus('Downloaded lithophane-cube.zip');
    } catch (err) {
      console.error(err);
      setStatus('Export failed — see console.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button className="btn" onClick={onExport} disabled={busy}>
        {busy ? 'Generating…' : 'Export STL parts (.zip)'}
      </button>
      <div className="status">
        {status || `${count} of 5 images added — frame & base always included.`}
      </div>
    </div>
  );
}
