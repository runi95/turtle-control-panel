export interface ChunkAnalysis {
    [key: string]: number;
}

export interface Chunk {
    serverId: number;
    x: number;
    z: number;
    analysis: ChunkAnalysis;
}
