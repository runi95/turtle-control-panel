export interface BlockState {
    [key: string]: string | number;
}

export interface BlockTags {
    [key: string]: string;
}

export interface Block {
    x: number;
    y: number;
    z: number;
    state: BlockState;
    name: string;
    tags: BlockTags;
}
