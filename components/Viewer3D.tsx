'use client';

import { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { useStore } from '@/lib/store';
import { imageDataToHeightMap, cropHeightMap } from '@/lib/image/toHeightmap';
import { buildAllParts, explodeVector } from '@/lib/geometry/assembly';
import { PART_COLORS } from '@/lib/geometry/constants';
import { initManifold, isManifoldReady } from '@/lib/geometry/manifoldInit';
import type { HeightMap, PanelSlot } from '@/lib/geometry/types';

function Parts() {
  const slots = useStore((s) => s.slots);
  const params = useStore((s) => s.params);
  const exploded = useStore((s) => s.exploded);

  const parts = useMemo(() => {
    if (!isManifoldReady()) return [];
    const heightMaps: Partial<Record<PanelSlot, HeightMap>> = {};
    (Object.keys(slots) as PanelSlot[]).forEach((slot) => {
      const d = slots[slot];
      if (d) {
        let hm = imageDataToHeightMap(d.imageData, {
          invert: params.invert,
          grayscaleMode: params.grayscaleMode,
          brightness: params.lithoBrightness,
          contrast: params.lithoContrast,
          autoContrast: params.lithoAutoContrast,
          sharpen: params.lithoSharpen,
        });
        if (d.crop) hm = cropHeightMap(hm, d.crop);
        heightMaps[slot] = hm;
      }
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
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {parts.map((part) => {
        const dir = explodeVector(part.id).multiplyScalar(exploded * dist);
        return (
          <group key={part.id} position={[dir.x, dir.y, dir.z]}>
            <mesh geometry={part.geometry} castShadow receiveShadow>
              <meshStandardMaterial
                color={PART_COLORS[part.id] ?? '#cccccc'}
                roughness={0.7}
                metalness={0.05}
                flatShading={true}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function Viewer3D() {
  const cubeSize = useStore((s) => s.params.cubeSize);
  const cam = cubeSize * 1.8;
  const [manifoldReady, setManifoldReady] = useState(false);

  useEffect(() => {
    initManifold().then(() => setManifoldReady(true));
  }, []);

  return (
    <Canvas
      shadows
      camera={{ position: [cam, cam * 0.8, cam], fov: 45, near: 1, far: cam * 20 }}
      gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.9 }}
      style={{ background: '#0b0d12' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[cubeSize * 1.5, cubeSize * 2, cubeSize * 1.5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={cubeSize * 0.1}
        shadow-camera-far={cubeSize * 6}
        shadow-camera-left={-cubeSize * 0.75}
        shadow-camera-right={cubeSize * 0.75}
        shadow-camera-top={cubeSize * 0.75}
        shadow-camera-bottom={-cubeSize * 0.75}
      />
      <directionalLight
        position={[-cubeSize, cubeSize, -cubeSize]}
        intensity={0.35}
      />
      {manifoldReady && <Parts />}
      <OrbitControls makeDefault enableDamping />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </Canvas>
  );
}
