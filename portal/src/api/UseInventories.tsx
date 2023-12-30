import {useQuery} from '@tanstack/react-query';
import {httpServerUrl} from '.';
import {ItemDetail} from '../App';

export interface ExternalInventory {
    serverId: number;
    x: number;
    y: number;
    z: number;
    content: {
        [key: number]: ItemDetail | null;
    };
    size: number;
}

export interface ExternalInventories {
    [key: string]: ExternalInventory;
}

export const useInventories = (serverId: string) => {
    return useQuery<ExternalInventories>({
        queryKey: ['external-inventories', serverId],
        queryFn: () =>
            fetch(`${httpServerUrl}/servers/${serverId}/external-inventories`)
                .then((res) => res.json())
                .then((data: ExternalInventory[]) =>
                    data.reduce(
                        (acc, curr) => ((acc[`${curr.x},${curr.y},${curr.z}`] = curr), acc),
                        {} as {[key: string]: ExternalInventory}
                    )
                ),
    });
};
