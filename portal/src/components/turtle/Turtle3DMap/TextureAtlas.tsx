import {useQuery} from '@tanstack/react-query';
import {
    ClampToEdgeWrapping,
    DataArrayTexture,
    LinearMipMapLinearFilter,
    NearestFilter,
    RGBAFormat,
    SRGBColorSpace,
    UnsignedByteType,
} from 'three';

export const useAtlas = () => {
    return useQuery<DataArrayTexture>({
        queryKey: ['atlas'],
        queryFn: () =>
            fetch('/atlas')
                .then((res) => res.arrayBuffer())
                .then((buffer: ArrayBuffer) => {
                    const uintArray = new Uint8Array(buffer);
                    const atlas = new DataArrayTexture(uintArray, 16, 16, uintArray.length / 1024);
                    atlas.format = RGBAFormat;
                    atlas.type = UnsignedByteType;
                    atlas.minFilter = LinearMipMapLinearFilter;
                    atlas.magFilter = NearestFilter;
                    atlas.wrapS = ClampToEdgeWrapping;
                    atlas.wrapT = ClampToEdgeWrapping;
                    atlas.generateMipmaps = true;
                    atlas.colorSpace = SRGBColorSpace;

                    atlas.needsUpdate = true;
                    return atlas;
                }),
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
        [key: string]: number;
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
