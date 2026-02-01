"use client";

import { useRef } from "react";
import { Block } from "../../../../types/block";
import { WorldHandle, WorldState } from "./world";
import HUD from "./HUD";
import Turtle3DMap from "./turtle3DMap";

export default function Home() {
  const worldRef = useRef<WorldHandle>(null!);

  function setWorldState(worldState: WorldState | null) {
    if (worldRef.current == null) return;
    worldRef.current.setState(worldState);
  }

  function setBlocksToPlace(blocks: Omit<Block, "tags">[]) {
    if (worldRef.current == null) return;
    worldRef.current.setBlocksToPlace(blocks);
  }

  function getSelectedBlocks() {
    if (worldRef.current == null) return [];
    return worldRef.current.getSelectedBlocks();
  }

  function getBuiltBlocks() {
    if (worldRef.current == null) return [];
    return worldRef.current.getBuiltBlocks();
  }

  function setBuildBlockType(type: string) {
    if (worldRef.current == null) return;
    worldRef.current.setBuildBlockType(type);
  }

  return (
    <>
      <Turtle3DMap worldRef={worldRef} />
      <HUD
        setWorldState={setWorldState}
        setBlocksToPlace={setBlocksToPlace}
        getSelectedBlocks={getSelectedBlocks}
        getBuiltBlocks={getBuiltBlocks}
        setBuildBlockType={setBuildBlockType}
      />
    </>
  );
}
