import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Model from "./model";
import styles from "./landing-page.module.css";
import Fuse from "fuse.js";
import { createAtlas } from "../helpers/atlas-creator";
import { createSpriteSheet } from "../helpers/sprite-sheet-creator";
import { createBasePlaneGeometries } from "../helpers/create-base-plane-geometries";

declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

type ModelFace = {
  uv?: [number, number, number, number];
  texture: string;
  cullface?: string;
  color?: string;
  tintindex?: string;
};

export type Element = {
  from: [number, number, number];
  to: [number, number, number];
  faces: {
    north?: ModelFace;
    south?: ModelFace;
    up?: ModelFace;
    down?: ModelFace;
    west?: ModelFace;
    east?: ModelFace;
  };
  rotation?: {
    axis: string;
    angle: number;
  };
};

export type ModelData = {
  parent?: string;
  textures?: {
    [key: string]: string;
  };
  elements?: Element[];
};

export type LoadedModelFile = ModelData & {
  file: string;
  name: string;
  asset: string;
};

export type BlockstatesData = {
  variants: {
    [key: string]: {
      model: string;
      x?: number;
      y?: number;
    };
  };
};

export type LoadedBlockstateFile = BlockstatesData & {
  file: string;
  name: string;
  asset: string;
};

type LoadedModel = {
  name: string;
};

export interface AtlasMapModels {
  [key: string]: {
    texture: string;
    face: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number
    ];
  }[];
}

export type AtlasMapTextures = {
  [key: string]: { model: string } & {
    [key: string]: number | { [key: string]: number };
  };
};

export type AtlasMapBlockData = {
  state?: {
    [key: string]: string;
  };
  model: string;
  x?: number;
  y?: number;
};

export type AtlasMapBlockstates = {
  [key: string]: AtlasMapBlockData[];
};

export interface AtlasMap {
  models: AtlasMapModels;
  textures: AtlasMapTextures;
  blockstates: AtlasMapBlockstates;
}

function LandingPage() {
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const atlasMapRef = useRef<AtlasMap | null>(null);
  const atlasRef = useRef<Uint8Array | null>(null);
  const spriteSheetRef = useRef<string | null>(null);
  const spriteMapRef = useRef<Map<string, number> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const spriteSheetCanvasRef = useRef<HTMLCanvasElement>(null!);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fuse = useMemo(() => {
    return new Fuse(loadedModels, {
      includeScore: true,
      keys: ["name"],
    });
  }, [loadedModels]);
  const filteredModels = useMemo(() => {
    if (filter == null) return loadedModels;
    return fuse
      .search(filter)
      .sort((a, b) => {
        if ((a.score as number) < (b.score as number)) return -1;
        if ((b.score as number) < (a.score as number)) return 1;
        return 0;
      })
      .map(({ item }) => item);
  }, [fuse, filter, loadedModels]);

  const handleDirectoryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files == null) return;

    setIsLoadingModels(true);

    const { atlasMap, atlas } = await createAtlas(canvasRef.current, files);
    const { sprites, spritesMap } = await createSpriteSheet(
      files,
      atlasMap,
      atlas,
      canvasRef.current,
      spriteSheetCanvasRef.current
    );

    atlasMapRef.current = atlasMap;
    atlasRef.current = atlas;

    spriteSheetRef.current = sprites;
    spriteMapRef.current = spritesMap;

    setLoadedModels(
      Object.keys(atlasMap.textures).map((key) => ({ name: key }))
    );
    setIsLoadingModels(false);
  };

  const geometries = useMemo(() => {
    return createBasePlaneGeometries();
  }, []);

  // Weird hack to fix issues with @react-three/drei
  const Btn: any = Button;

  return (
    <Container className="h-100" fluid>
      <Row className="h-100">
        <Col md={4} className="h-100 d-flex flex-column overflow-hidden">
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Upload assets directory</Form.Label>
                {/* eslint-disable react/no-unknown-property */}
                <input
                  className="form-control"
                  type="file"
                  webkitdirectory=""
                  directory=""
                  onChange={(e) => handleDirectoryUpload(e)}
                  disabled={isLoadingModels}
                />
                {/* eslint-enable react/no-unknown-property */}
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="Search..."
                  onChange={(e) => {
                    const value = e.target.value;
                    if (debounceTimeoutRef.current != null) {
                      clearTimeout(debounceTimeoutRef.current);
                    }

                    debounceTimeoutRef.current = setTimeout(() => {
                      setFilter(value);
                    }, 250);
                  }}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className={`mb-3 ${styles.scrollable}`}>
            <Col>
              {loadedModels.length > 0 ? (
                <ul className={styles.pointer}>
                  {filteredModels.map(({ name }) => (
                    <li
                      className={
                        name === selectedModel
                          ? `${styles.selectableListElement} ${styles.selected}`
                          : styles.selectableListElement
                      }
                      key={name}
                      onClick={() => {
                        setSelectedModel(name);
                      }}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No models loaded</p>
              )}
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <div
                className={
                  loadedModels.length > 0 ? undefined : styles.btnNotAllowed
                }
              >
                <Btn
                  className="w-100"
                  disabled={loadedModels.length < 1}
                  onClick={() => {
                    fetch("/api/save-file", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        atlas:
                          atlasRef.current == null
                            ? null
                            : Array.from(atlasRef.current),
                        atlasMap: atlasMapRef.current,
                        sprites: spriteSheetRef.current,
                        spritesMap:
                          spriteMapRef.current == null
                            ? null
                            : Object.fromEntries(spriteMapRef.current),
                      }),
                    })
                      .then((response) => console.log(response))
                      .catch((err) =>
                        console.error("Error fetching data:", err)
                      );
                  }}
                >
                  Save
                </Btn>
              </div>
            </Col>
          </Row>
        </Col>
        <Col md={8}>
          <canvas ref={canvasRef} width={16} height={16} hidden />
          <div className={styles.fullHeight}>
            <Canvas
              gl={{
                antialias: false,
                depth: true,
              }}
              camera={{
                fov: 60,
                near: 0.5,
                far: 10000.0,
              }}
            >
              <Model
                atlas={atlasRef.current}
                atlasMap={atlasMapRef.current}
                geometries={geometries}
                modelName={selectedModel}
              />
              <OrbitControls />
            </Canvas>
          </div>
          <canvas ref={spriteSheetCanvasRef} hidden />
        </Col>
      </Row>
    </Container>
  );
}

export default LandingPage;
