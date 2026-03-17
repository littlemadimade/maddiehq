"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, Float, Text } from "@react-three/drei";

const layers = Array.from({ length: 9 }, (_, index) => ({
  z: -index * 0.055,
  color: index === 0 ? "#f8ff6d" : index < 4 ? "#ff4fa3" : "#6eff3e"
}));

function HelloText() {
  return (
    <Float speed={1.2} rotationIntensity={0} floatIntensity={0.45}>
      <group>
        {layers.map((layer, index) => (
          <Text
            key={index}
            position={[0, 0, layer.z]}
            fontSize={1.45}
            letterSpacing={-0.04}
            maxWidth={10}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
          >
            Hello Maddie
            <meshStandardMaterial
              color={layer.color}
              roughness={0.18}
              metalness={0.8}
              emissive={index === 0 ? "#d4ff2f" : "#ff2f92"}
              emissiveIntensity={index === 0 ? 0.75 : 0.22}
            />
          </Text>
        ))}
      </group>
    </Float>
  );
}

export default function HomePage() {
  return (
    <main className="page">
      <div className="page__chrome">
        <p className="eyebrow">Maddie HQ</p>
        <h1>Future-facing OF management, starting with a hello.</h1>
        <p className="lede">
          A simple landing scene for now. The foundation is ready for dashboards,
          workflows, and whatever Maddie needs next.
        </p>
      </div>

      <div className="scene-shell">
        <div className="scene-glow scene-glow--lime" />
        <div className="scene-glow scene-glow--pink" />
        <Canvas camera={{ position: [0, 0, 6], fov: 42 }}>
          <color attach="background" args={["#0b1403"]} />
          <fog attach="fog" args={["#0b1403", 7, 14]} />
          <ambientLight intensity={1.15} />
          <directionalLight position={[4, 3, 6]} intensity={2.5} color="#fbff9a" />
          <pointLight position={[-4, -2, 4]} intensity={1.6} color="#ff4fa3" />
          <HelloText />
          <Environment preset="city" />
        </Canvas>
      </div>
    </main>
  );
}
