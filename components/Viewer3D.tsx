'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useStore } from '@/lib/store';
import { imageDataToHeightMap } from '@/lib/image/toHeightmap';
import { buildAllParts, explodeVector } from '@/lib/geometry/assembly';
import { PART_COLORS } from '@/lib/geometry/constants';
import type { HeightMap, PanelSlot } from '@/lib/geometry/types';

function Parts() {
  const slots = useStore((s) => s.slots);
  const params = useStore((s) => s.params);
  const exploded = useStore((s) => s.exploded);

  const parts = useMemo(() => {
    const heightMaps: Partial<Record<PanelSlot, HeightMap>> = {};
    (Object.keys(slots) as PanelSlot[]).forEach((slot) => {
      const d = slots[slot];
      if (d) heightMaps[slot] = imageDataToHeightMap(d.imageData, params.invert);
    });
    try {
      return buildAllParts(heightMaps, params, params.previewResolution);
    } catch (err) {
      console.error('Geometry build failed', err);
      return [];
    }
  }, [slots, params]);

  const dist = params.cubeSize * 0.7;

  return (
    <>
      {parts.map((part) => {
        const dir = explodeVector(part.id).multiplyScalar(exploded * dist);
        return (
          <mesh
            key={part.id}
            geometry={part.geometry}
            position={[dir.x, dir.y, dir.z]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={PART_COLORS[part.id] ?? '#cccccc'}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
        );
      })}
    </>
  );
}

export default function Viewer3D() {
  const cubeSize = useStore((s) => s.params.cubeSize);
  const cam = cubeSize * 1.8;

  return (
    <Canvas
      shadows
      camera={{ position: [cam, cam * 0.8, cam], fov: 45, near: 1, far: cam * 20 }}
      style={{ background: '#0b0d12' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 2, 1.5].map((v) => v * cubeSize) as [number, number, number]} intensity={1.2} castShadow />
      <directionalLight position={[-1, 1, -1].map((v) => v * cubeSize) as [number, number, number]} intensity={0.4} />
      <Parts />
      <OrbitControls makeDefault enableDamping />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </Canvas>
  );
}
