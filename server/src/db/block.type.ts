export interface BlockState {
    [key: string]: string | number;
}

export interface BlockTags {
    [key: string]: string;
}

export interface Block {
    state: BlockState;
    name: string;
    tags: BlockTags;
}
