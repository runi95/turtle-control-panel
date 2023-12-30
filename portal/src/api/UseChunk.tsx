import {useQuery} from '@tanstack/react-query';
import {httpServerUrl} from '.';

export interface Chunk {
    serverId: number;
    x: number;
    z: number;
    analysis: {
        [key: string]: number;
    };
}

export const useChunk = (serverId: string, x: number, z: number) => {
    return useQuery<Chunk>({
        queryKey: ['chunks', serverId, x, z],
        queryFn: () => fetch(`${httpServerUrl}/servers/${serverId}/chunks?x=${x}&z=${z}`).then((res) => res.json()),
    });
};
