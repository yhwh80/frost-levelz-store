"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 300 }) {
  const mesh = useRef<THREE.Points>(null);

  const [positions, speeds, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const sz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Spread particles across the scene
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      // Random fall speed
      spd[i] = 0.002 + Math.random() * 0.008;

      // Random sizes
      sz[i] = 0.5 + Math.random() * 2;
    }

    return [pos, spd, sz];
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;
    const posArray = mesh.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Drift down slowly
      posArray[i * 3 + 1] -= speeds[i];

      // Gentle horizontal sway
      posArray[i * 3] += Math.sin(Date.now() * 0.0003 + i) * 0.001;

      // Reset to top when fallen below
      if (posArray[i * 3 + 1] < -6) {
        posArray[i * 3 + 1] = 6;
        posArray[i * 3] = (Math.random() - 0.5) * 20;
      }
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;

    // Slow rotation of the whole system
    mesh.current.rotation.y += 0.0002;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#89CFF0"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function FloatingShards({ count = 15 }) {
  const group = useRef<THREE.Group>(null);

  const shards = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6 - 2,
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ] as [number, number, number],
      scale: 0.05 + Math.random() * 0.15,
      speed: 0.001 + Math.random() * 0.003,
      rotSpeed: 0.002 + Math.random() * 0.005,
      id: i,
    }));
  }, [count]);

  useFrame(() => {
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      const shard = shards[i];
      child.rotation.x += shard.rotSpeed;
      child.rotation.z += shard.rotSpeed * 0.5;
      child.position.y -= shard.speed;

      if (child.position.y < -6) {
        child.position.y = 6;
        child.position.x = (Math.random() - 0.5) * 16;
      }
    });
  });

  return (
    <group ref={group}>
      {shards.map((shard) => (
        <mesh
          key={shard.id}
          position={shard.position}
          rotation={shard.rotation}
          scale={shard.scale}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#89CFF0"
            transparent
            opacity={0.15}
            wireframe
            emissive="#89CFF0"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function IceParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#89CFF0" />
        <Particles count={300} />
        <FloatingShards count={15} />
      </Canvas>
    </div>
  );
}
