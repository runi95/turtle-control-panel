import {useQuery} from '@tanstack/react-query';
import {httpServerUrl} from '.';
import {Area, Areas} from '../App';

export const useAreas = (serverId: string) => {
    return useQuery<Areas>({
        queryKey: ['areas', serverId],
        queryFn: () =>
            fetch(`${httpServerUrl}/servers/${serverId}/areas`)
                .then((res) => res.json())
                .then((data: Area[]) =>
                    data.reduce((acc, curr) => ((acc[curr.id.toString()] = curr), acc), {} as {[key: string]: Area})
                ),
    });
};
