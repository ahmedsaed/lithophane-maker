'use client';

import { useState } from 'react';
import { saveAs } from 'file-saver';
import { useStore } from '@/lib/store';
import { fileToImageData } from '@/lib/image/loadImage';
import { imageDataToHeightMap, cropHeightMap } from '@/lib/image/toHeightmap';
import { exportPartsZip } from '@/lib/export/exportZip';
import { geometryToStlBlob } from '@/lib/export/exportStl';
import { buildFrame } from '@/lib/geometry/frame';
import { buildLidFrame } from '@/lib/geometry/lidFrame';
import { buildPanelFlat, buildTopPanelFlat } from '@/lib/geometry/assembly';
import type { HeightMap, PanelSlot } from '@/lib/geometry/types';

const SLOT_LABELS: Record<PanelSlot, string> = {
  front: 'Front panel',
  back: 'Back panel',
  left: 'Left panel',
  right: 'Right panel',
  top: 'Top panel',
};

const SLOT_ORDER: PanelSlot[] = ['front', 'back', 'left', 'right', 'top'];

export default function ExportPanel() {
  const slots = useStore((s) => s.slots);
  const params = useStore((s) => s.params);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const imageProcessingOpts = {
    invert: params.invert,
    grayscaleMode: params.grayscaleMode,
    brightness: params.lithoBrightness,
    contrast: params.lithoContrast,
    autoContrast: params.lithoAutoContrast,
    sharpen: params.lithoSharpen,
  };

  async function buildSlotHeightMap(slot: PanelSlot): Promise<HeightMap | null> {
    const d = slots[slot];
    if (!d) return null;
    const img = await fileToImageData(d.file, params.exportResolution);
    let hm = imageDataToHeightMap(img, imageProcessingOpts);
    if (d.crop) hm = cropHeightMap(hm, d.crop);
    return hm;
  }

  const onExportFrame = async () => {
    setBusy(true);
    setStatus('Building frame…');
    try {
      const blob = geometryToStlBlob(buildFrame(params));
      saveAs(blob, 'frame.stl');
      setStatus('Downloaded frame.stl');
    } catch (err) {
      console.error(err);
      setStatus('Export failed — see console.');
    } finally {
      setBusy(false);
    }
  };

  const onExportLid = async () => {
    setBusy(true);
    setStatus('Building lid…');
    try {
      const blob = geometryToStlBlob(buildLidFrame(params));
      saveAs(blob, 'lid.stl');
      setStatus('Downloaded lid.stl');
    } catch (err) {
      console.error(err);
      setStatus('Export failed — see console.');
    } finally {
      setBusy(false);
    }
  };

  const onExportPanel = async (slot: PanelSlot) => {
    setBusy(true);
    const label = SLOT_LABELS[slot];
    setStatus(`Building ${label}…`);
    try {
      const hm = await buildSlotHeightMap(slot);
      if (!hm) return;
      const geom = slot === 'top'
        ? buildTopPanelFlat(hm, params, params.exportResolution)
        : buildPanelFlat(slot, hm, params, params.exportResolution);
      const filename = slot === 'top' ? 'top.stl' : `side-${slot}.stl`;
      saveAs(geometryToStlBlob(geom), filename);
      setStatus(`Downloaded ${filename}`);
    } catch (err) {
      console.error(err);
      setStatus('Export failed — see console.');
    } finally {
      setBusy(false);
    }
  };

  const onExportAll = async () => {
    setBusy(true);
    setStatus('Decoding images…');
    try {
      const heightMaps: Partial<Record<PanelSlot, HeightMap>> = {};
      for (const slot of SLOT_ORDER) {
        const hm = await buildSlotHeightMap(slot);
        if (hm) {
          setStatus(`Building ${SLOT_LABELS[slot]}…`);
          heightMaps[slot] = hm;
        }
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

  const count = Object.keys(slots).length;

  return (
    <div>
      <div className="export-parts">
        <div className="export-row">
          <span className="export-label">Frame</span>
          <button className="btn btn-sm" onClick={onExportFrame} disabled={busy}>
            Download
          </button>
        </div>
        <div className="export-row">
          <span className="export-label">Lid</span>
          <button className="btn btn-sm" onClick={onExportLid} disabled={busy}>
            Download
          </button>
        </div>
        {SLOT_ORDER.map((slot) =>
          slots[slot] ? (
            <div key={slot} className="export-row">
              <span className="export-label">{SLOT_LABELS[slot]}</span>
              <button className="btn btn-sm" onClick={() => onExportPanel(slot)} disabled={busy}>
                Download
              </button>
            </div>
          ) : null,
        )}
      </div>

      <button className="btn" style={{ marginTop: 10 }} onClick={onExportAll} disabled={busy}>
        {busy ? 'Generating…' : 'Download all (.zip)'}
      </button>

      <div className="status">
        {status || `${count} of 4 images added — frame always included.`}
      </div>
    </div>
  );
}
