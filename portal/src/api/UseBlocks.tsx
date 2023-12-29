import {useQuery} from '@tanstack/react-query';
import {httpServerUrl} from '.';
import {Block, Blocks} from '../App';

export interface QueryParams {
    fromX: number;
    toX: number;
    fromY: number;
    toY: number;
    fromZ: number;
    toZ: number;
}

export const useBlocks = (serverId: string, query: QueryParams, isEnabled: boolean) => {
    return useQuery<Blocks>({
        queryKey: ['blocks', serverId, {query}],
        queryFn: () =>
            fetch(
                `${httpServerUrl}/servers/${serverId}/blocks?fromX=${query.fromX}&toX=${query.toX}&fromY=${query.fromY}&toY=${query.toY}&fromZ=${query.fromZ}&toZ=${query.toZ}`
            )
                .then((res) => res.json())
                .then((data: Block[]) =>
                    data.reduce(
                        (acc, curr) => ((acc[`${curr.x},${curr.y},${curr.z}`] = curr), acc),
                        {} as {[key: string]: Block}
                    )
                ),
        enabled: isEnabled,
    });
};
