import { deleteBlocks, upsertBlocks } from "../../db/index";
import { Block } from "../../db/block.type";
import { Location } from "../../db/turtle.type";
import globalEventEmitter from "../../globalEventEmitter";
import { Turtle } from "../turtle";
import { TurtleBaseState } from "./base";
import { TURTLE_STATES } from "./helpers";

export interface ScanningStateData {
  readonly id: TURTLE_STATES;
}

const scanSize = 16;

export class TurtleScanState extends TurtleBaseState<ScanningStateData> {
  public readonly id = TURTLE_STATES.SCANNING;
  public readonly name = "scanning";
  public data = {
    id: TURTLE_STATES.SCANNING,
  };

  constructor(turtle: Turtle) {
    super(turtle);
  }

  public async *act() {
    if (this.turtle.location === null) {
      throw new Error("Unable to scan without knowing turtle location");
    }

    const [hasGeoScanner] =
      await this.turtle.hasPeripheralWithName("geoScanner");
    if (hasGeoScanner) {
      yield* geoScannerCooldown(this.turtle);
      await useGeoScanner(this.turtle);
      return;
    }

    yield;

    const [hasUniversalScanner] =
      await this.turtle.hasPeripheralWithName("universal_scanner");
    if (hasUniversalScanner) {
      yield* universalScannerCooldown(this.turtle);
      await useUniversalScanner(this.turtle);
      return;
    }

    yield;

    const [hasBlockScanner] =
      await this.turtle.hasPeripheralWithName("plethora:scanner");
    if (hasBlockScanner) {
      await useBlockScanner(this.turtle);
      return;
    }

    throw new Error("No Scanner to scan with");
  }
}

export const useBlockScanner = async (
  turtle: Turtle,
): Promise<(Block & Location)[]> => {
  const [scannedBlocks, scanMessage] = await turtle.usePeripheralWithName<
    [(Block & Location)[], string]
  >("plethora:scanner", "scan");
  if (scannedBlocks === null) {
    throw new Error(scanMessage);
  }

  const { x, y, z } = turtle.location as Location;
  const blocks = [];
  const existingBlocks = new Map<string, boolean>();
  const deletedBlocks: Location[] = [];
  for (const scannedBlock of scannedBlocks) {
    if (scannedBlock.x === 0 && scannedBlock.y === 0 && scannedBlock.z === 0)
      continue;
    if (scannedBlock.name === "minecraft:air") {
      deletedBlocks.push({
        x: scannedBlock.x + x,
        y: scannedBlock.y + y,
        z: scannedBlock.z + z,
      });
      continue;
    }
    if (scannedBlock.name === "computercraft:turtle_advanced") continue;
    if (scannedBlock.name === "computercraft:turtle_normal") continue;
    blocks.push({
      ...scannedBlock,
      x: scannedBlock.x + x,
      y: scannedBlock.y + y,
      z: scannedBlock.z + z,
    });
    existingBlocks.set(
      `${scannedBlock.x},${scannedBlock.y},${scannedBlock.z}`,
      true,
    );
  }

  deleteBlocks(turtle.serverId, deletedBlocks);
  upsertBlocks(turtle.serverId, blocks);
  globalEventEmitter.emit("wupdate", {
    serverId: turtle.serverId,
    blocks,
    deletedBlocks,
  });

  return scannedBlocks;
};

export async function* universalScannerCooldown(turtle: Turtle) {
  let [cooldown] = await turtle.usePeripheralWithName<[number]>(
    "universal_scanner",
    "getCooldown",
    '"portableUniversalScan"',
  );
  yield;

  while (cooldown > 0) {
    await turtle.sleep(Math.min(1, Math.ceil(cooldown / 100) / 10));
    cooldown -= 1000;

    yield;
  }
}

export const useUniversalScanner = async (
  turtle: Turtle,
): Promise<(Block & Location)[]> => {
  const [scannedBlocks, scanMessage] = await turtle.usePeripheralWithName<
    [(Block & Location)[], string]
  >("universal_scanner", "scan", '"block"', `${scanSize}`);
  if (scannedBlocks === null) {
    throw new Error(scanMessage);
  }

  const { x, y, z } = turtle.location as Location;
  const blocks = [];
  const existingBlocks = new Map<string, boolean>();
  for (const scannedBlock of scannedBlocks) {
    if (scannedBlock.x === 0 && scannedBlock.y === 0 && scannedBlock.z === 0)
      continue;
    if (scannedBlock.name === "computercraft:turtle_advanced") continue;
    if (scannedBlock.name === "computercraft:turtle_normal") continue;
    blocks.push({
      ...scannedBlock,
      x: scannedBlock.x + x,
      y: scannedBlock.y + y,
      z: scannedBlock.z + z,
    });
    existingBlocks.set(
      `${scannedBlock.x},${scannedBlock.y},${scannedBlock.z}`,
      true,
    );
  }

  const deletedBlocks = [];
  for (let i = -scanSize; i < scanSize; i++) {
    for (let j = -scanSize; j < scanSize; j++) {
      for (let k = -scanSize; k < scanSize; k++) {
        if (!existingBlocks.get(`${i + x},${j + y},${k + z}`)) {
          deletedBlocks.push({
            x: i + x,
            y: j + y,
            z: k + z,
          });
        }
      }
    }
  }

  deleteBlocks(turtle.serverId, deletedBlocks);
  upsertBlocks(turtle.serverId, blocks);
  globalEventEmitter.emit("wupdate", {
    serverId: turtle.serverId,
    blocks,
    deletedBlocks,
  });

  return scannedBlocks;
};

export async function* geoScannerCooldown(turtle: Turtle) {
  let [cooldown] = await turtle.usePeripheralWithName<[number]>(
    "geoScanner",
    "getOperationCooldown",
    '"scanBlocks"',
  );
  yield;

  while (cooldown > 0) {
    await turtle.sleep(Math.min(1, Math.ceil(cooldown / 100) / 10));
    cooldown -= 1000;

    yield;
  }
}

export const useGeoScanner = async (
  turtle: Turtle,
): Promise<(Block & Location)[]> => {
  const [scannedBlocks, scanMessage] = await turtle.usePeripheralWithName<
    [(Block & { x: number; y: number; z: number })[], string]
  >("geoScanner", "scan", `${scanSize}`);
  if (scannedBlocks === null) {
    throw new Error(scanMessage);
  }

  const { x, y, z } = turtle.location as Location;
  const blocks = [];
  const existingBlocks = new Map<string, boolean>();
  for (const scannedBlock of scannedBlocks) {
    if (scannedBlock.x === 0 && scannedBlock.y === 0 && scannedBlock.z === 0)
      continue;
    if (scannedBlock.name === "computercraft:turtle_advanced") continue;
    if (scannedBlock.name === "computercraft:turtle_normal") continue;
    blocks.push({
      ...scannedBlock,
      x: scannedBlock.x + x,
      y: scannedBlock.y + y,
      z: scannedBlock.z + z,
    });
    existingBlocks.set(
      `${scannedBlock.x},${scannedBlock.y},${scannedBlock.z}`,
      true,
    );
  }

  const deletedBlocks = [];
  for (let i = -scanSize; i < scanSize; i++) {
    for (let j = -scanSize; j < scanSize; j++) {
      for (let k = -scanSize; k < scanSize; k++) {
        if (!existingBlocks.get(`${i + x},${j + y},${k + z}`)) {
          deletedBlocks.push({
            x: i + x,
            y: j + y,
            z: k + z,
          });
        }
      }
    }
  }

  deleteBlocks(turtle.serverId, deletedBlocks);
  upsertBlocks(turtle.serverId, blocks);
  globalEventEmitter.emit("wupdate", {
    serverId: turtle.serverId,
    blocks,
    deletedBlocks,
  });

  return scannedBlocks;
};
