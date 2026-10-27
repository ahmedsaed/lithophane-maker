'use client';

import { useState } from 'react';
import { saveAs } from 'file-saver';
import { useStore } from '@/lib/store';
import { fileToImageData } from '@/lib/image/loadImage';
import { imageDataToHeightMap, cropHeightMap } from '@/lib/image/toHeightmap';
import { exportCouponsZip, exportPartsZip } from '@/lib/export/exportZip';
import { buildClearanceSweep, buildTestKit } from '@/lib/geometry/coupons';
import { GUIDE_URL } from '@/components/GitHubLink';
import { geometryToStlBlob } from '@/lib/export/exportStl';
import { buildFrame } from '@/lib/geometry/frame';
import { buildLidForPrint } from '@/lib/geometry/lidFrame';
import { BLANK_HEIGHTMAP, buildPanelForPrint, buildTopPanelForPrint, panelFileName } from '@/lib/geometry/assembly';
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
      const blob = geometryToStlBlob(buildLidForPrint(params));
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
      const photo = await buildSlotHeightMap(slot);
      const hm = photo ?? BLANK_HEIGHTMAP;
      const geom = slot === 'top'
        ? buildTopPanelForPrint(hm, params, params.exportResolution)
        : buildPanelForPrint(slot, hm, params, params.exportResolution);
      const filename = panelFileName(slot, !photo);
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

  const onExportCoupons = async (kind: 'kit' | 'sweep') => {
    setBusy(true);
    setStatus('Building test prints…');
    try {
      const filename = kind === 'kit' ? 'lithophane-test-kit.zip' : 'lithophane-clearance-sweep.zip';
      const coupons = kind === 'kit' ? buildTestKit(params) : buildClearanceSweep(params);
      await exportCouponsZip(coupons, filename);
      setStatus(`Downloaded ${filename}`);
    } catch (err) {
      console.error(err);
      setStatus('Export failed — see console.');
    } finally {
      setBusy(false);
    }
  };

  const photos = Object.keys(slots).length;
  const blanks = SLOT_ORDER.length - photos;
  const summary = blanks === 0
    ? 'All 5 panels have photos.'
    : `${photos} photo${photos === 1 ? '' : 's'} + ${blanks} blank panel${blanks === 1 ? '' : 's'}. Add images above to replace the blanks.`;

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
        {SLOT_ORDER.map((slot) => (
          <div key={slot} className="export-row">
            <span className="export-label">
              {SLOT_LABELS[slot]}
              {!slots[slot] && <span className="blank-tag">blank</span>}
            </span>
            <button className="btn btn-sm" onClick={() => onExportPanel(slot)} disabled={busy}>
              Download
            </button>
          </div>
        ))}
      </div>

      <button className="btn" style={{ marginTop: 10 }} onClick={onExportAll} disabled={busy}>
        {busy ? 'Generating…' : 'Download all (.zip)'}
      </button>

      <p className="field-desc" style={{ marginTop: 14 }}>
        Not sure about the fit? Print small test pieces first. They take minutes,
        not hours. The{' '}
        <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">printing guide</a>{' '}
        walks through them.
      </p>
      <div className="export-parts">
        <div className="export-row">
          <span className="export-label">Test kit</span>
          <button className="btn btn-sm" onClick={() => onExportCoupons('kit')} disabled={busy}>
            Download
          </button>
        </div>
        <div className="export-row">
          <span className="export-label">Clearance sweep</span>
          <button className="btn btn-sm" onClick={() => onExportCoupons('sweep')} disabled={busy}>
            Download
          </button>
        </div>
      </div>

      <div className="status">
        {status || summary}
      </div>
    </div>
  );
}
