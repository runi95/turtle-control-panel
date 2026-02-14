"use client";

import { Canvas } from "@react-three/fiber";
import World, { WorldHandle } from "./world";
import { OrbitControls } from "@react-three/drei";
import { Ref } from "react";

interface Props {
  worldRef: Ref<WorldHandle>;
}

function Turtle3DMap(props: Props) {
  const { worldRef } = props;

  return (
    <Canvas
      gl={{
        antialias: false,
        depth: true,
      }}
      camera={{
        fov: 60,
        near: 0.5,
        far: 10000.0,
        position: [15, 50, 15],
      }}
      className="canvas"
    >
      <World ref={worldRef} chunkSize={16} visibleChunkRadius={1} />
      <OrbitControls />
    </Canvas>
  );
}

export default Turtle3DMap;
