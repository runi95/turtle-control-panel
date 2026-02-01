import { BlockState } from "./block-state";
import { BlockTags } from "./block-tags";

export interface Block {
  state: BlockState;
  name: string;
  tags: BlockTags;
  x: number;
  y: number;
  z: number;
}
