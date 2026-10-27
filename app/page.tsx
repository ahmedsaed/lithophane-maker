'use client';

import dynamic from 'next/dynamic';
import UploaderGrid from '@/components/UploaderGrid';
import ParamsPanel from '@/components/ParamsPanel';
import ExportPanel from '@/components/ExportPanel';
import GitHubCard, { GitHubIconLink, GUIDE_URL } from '@/components/GitHubLink';
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { useStore } from '@/lib/store';

// WebGL canvas is browser-only; skip SSR during static export.
const Viewer3D = dynamic(() => import('@/components/Viewer3D'), { ssr: false });

function ExplodeControl() {
  const exploded = useStore((s) => s.exploded);
  const setExploded = useStore((s) => s.setExploded);
  return (
    <div className="explode-control">
      <span>Assembled</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={exploded}
        onChange={(e) => setExploded(parseFloat(e.target.value))}
      />
      <span>Exploded</span>
    </div>
  );
}

/** schema.org description of the tool, for search results. */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Any (runs in a web browser)',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://opensource.org/licenses/MIT',
  author: { '@type': 'Person', name: AUTHOR },
};

export default function Home() {
  return (
    <div className="app">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <aside className="sidebar">
        <div className="title-row">
          <h1>Lithophane Cube Maker</h1>
          <span className="beta-badge" title="Still being tested. Print the test pieces before a full cube.">Beta</span>
          <GitHubIconLink />
        </div>
        <p className="subtitle">
          5 images → a backlit printable cube. New here? Read the{' '}
          <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">printing guide</a>{' '}
          before your first print.
        </p>

        <div className="section">
          <h2>Images</h2>
          <UploaderGrid />
        </div>

        <div className="section">
          <h2>Parameters</h2>
          <ParamsPanel />
        </div>

        <div className="section">
          <h2>Export</h2>
          <ExportPanel />
        </div>

        <GitHubCard />
      </aside>

      <main className="viewer">
        <Viewer3D />
        <div className="overlay">
          <span className="hint-pointer">Drag to orbit · scroll to zoom · use the slider to explode</span>
          <span className="hint-touch">Drag to orbit · pinch to zoom</span>
        </div>
        <ExplodeControl />
      </main>
    </div>
  );
}
