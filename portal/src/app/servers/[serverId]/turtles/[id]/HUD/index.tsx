"use client";

import Inventory from "./inventory";
import { useTurtle } from "../../../../../hooks/useTurtle";
import ActionHUD from "./actionHUD";
import LocationHUD from "./locationHUD";
import Peripherals from "./peripherals";
import ConfigHUD from "./configHUD";
import { WorldState } from "../world";
import { Block } from "../../../../../types/block";
import FuelInfo from "../../../../../components/fuelInfo";
import { Location } from "../../../../../types/location";
import ArrowLeftIcon from "../../../../../components/icons/arrowLeftIcon";
import { useParams, useRouter } from "next/navigation";

interface Props {
  setWorldState: (worldState: WorldState | null) => void;
  setBlocksToPlace: (blocks: Omit<Block, "tags">[]) => void;
  getSelectedBlocks: () => Location[];
  getBuiltBlocks: () => Omit<Block, "tags">[];
  setBuildBlockType: (type: string) => void;
}

function HUD({
  setWorldState,
  setBlocksToPlace,
  getSelectedBlocks,
  getBuiltBlocks,
  setBuildBlockType,
}: Props) {
  const { serverId, id } = useParams<{ serverId: string; id: string }>();
  const router = useRouter();
  const { data: turtle } = useTurtle(serverId, id);

  if (turtle == null) return null;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          position: "fixed",
          left: "50%",
          top: 10,
          transform: "translateX(-50%)",
          opacity: 0.8,
          pointerEvents: "none",
        }}
      >
        <FuelInfo fuelLevel={turtle?.fuelLevel} fuelLimit={turtle?.fuelLimit} />
        <div style={{ pointerEvents: "none", textAlign: "center" }}>
          <h5>
            <ins style={{ textTransform: "capitalize" }}>
              {turtle?.state?.name || "idle"}
            </ins>
          </h5>
          {turtle.error ? (
            <h5>
              <span>
                (<span className="text-danger">{turtle.error}</span>)
              </span>
            </h5>
          ) : turtle.state?.warning ? (
            <h5>
              <span>
                (
                <span className="text-warning">
                  {turtle.state.warning as string}
                </span>
                )
              </span>
            </h5>
          ) : null}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          right: 10,
          top: 0,
          opacity: 0.8,
        }}
      >
        <ConfigHUD />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          right: 10,
          bottom: 10,
          opacity: 0.8,
        }}
      >
        <LocationHUD />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          left: 0,
          top: 0,
          opacity: 0.8,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            margin: "14px auto 55px 10px",
            cursor: "pointer",
            pointerEvents: "all",
          }}
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          <ArrowLeftIcon color="#c6c6c6" height={25} width={25} />
        </div>
        <div
          style={{
            pointerEvents: "all",
          }}
        >
          <Inventory />
        </div>
        <div
          style={{
            pointerEvents: "all",
          }}
        >
          <Peripherals turtle={turtle} />
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 10,
          transform: "translateX(-50%)",
          opacity: 0.8,
          pointerEvents: "all",
        }}
      >
        <ActionHUD
          setWorldState={setWorldState}
          setBlocksToPlace={setBlocksToPlace}
          getSelectedBlocks={getSelectedBlocks}
          getBuiltBlocks={getBuiltBlocks}
          setBuildBlockType={setBuildBlockType}
        />
      </div>
      {turtle.location == null ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.8,
            pointerEvents: "all",
          }}
        >
          <div className="text-danger">
            <h1>TURTLE LOCATION IS MISSING</h1>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default HUD;
