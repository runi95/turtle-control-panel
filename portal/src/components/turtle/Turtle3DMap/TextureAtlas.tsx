import {useQuery} from '@tanstack/react-query';

export const useAtlas = () => {
    return useQuery<ArrayBuffer>({
        queryKey: ['atlas'],
        queryFn: () => fetch('/atlas').then((res) => res.arrayBuffer()),
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
    });
};

export interface AtlasMapModels {
    [key: string]: {
        texture: string;
        inverted: boolean;
        face: [number, number, number, number, number, number, number, number, number, number, number, number];
    }[];
}

export type AtlasMapTextures = {
    [key: string]: {model: string} & {
        [key: string]: number | {[key: string]: number};
    };
};

export interface AtlasMap {
    models: AtlasMapModels;
    textures: AtlasMapTextures;
}

export const useAtlasMap = () => {
    return useQuery<AtlasMap>({
        queryKey: ['atlas.map'],
        queryFn: () => fetch('/atlas.map.json').then((res) => res.json()),
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
    });
};
