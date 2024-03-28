import {useQuery} from '@tanstack/react-query';
import {httpServerUrl} from '.';

export enum Direction {
    West = 1,
    North = 2,
    East = 3,
    South = 4,
}

export interface Inventory {
    [key: number]: ItemDetail | undefined;
}

export interface Peripheral {
    data: unknown;
    types: string[];
}

export interface Peripherals {
    [key: string]: Peripheral;
}

export interface BaseState {
    id: number;
    error?: string;
    name: string;
    [key: string]: unknown;
}

export interface Location {
    x: number;
    y: number;
    z: number;
}

export interface Enchantment {
    level: number;
    name: string;
    displayName: string;
}

export interface ItemDetail {
    enchantments?: Enchantment[];
    durability: number;
    maxDamage: number;
    damage: number;
    nbt: string;
    name: string;
    tags: {
        [key: string]: string;
    };
    count: number;
    maxCount: string;
    displayName: string;
}

export interface Turtle {
    serverId: number;
    id: number;
    name: string;
    isOnline: boolean;
    fuelLevel: number;
    fuelLimit: number;
    selectedSlot: number;
    inventory: Inventory;
    stepsSinceLastRefuel: number;
    state?: BaseState;
    location: Location;
    direction: Direction;
    peripherals: Peripherals | null;
    home: Location | null;
    error: string | null;
}

export const useTurtle = (serverId: string, id: string) => {
    return useQuery<Turtle>({
        queryKey: ['turtles', serverId, id],
        queryFn: () => fetch(`${httpServerUrl}/servers/${serverId}/turtles/${id}`).then((res) => res.json()),
    });
};

export const useTurtles = (serverId: string) => {
    return useQuery<Turtle[]>({
        queryKey: ['turtles', serverId],
        queryFn: () => fetch(`${httpServerUrl}/servers/${serverId}/turtles`).then((res) => res.json()),
    });
};
