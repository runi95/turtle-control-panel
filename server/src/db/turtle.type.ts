export enum Direction {
    West = 1,
    North = 2,
    East = 3,
    South = 4,
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

export interface Inventory {
    [key: number]: ItemDetail | undefined;
}

export interface BaseState {
    id: number;
    name: string;
    error?: string;
    meta?: Record<string, unknown>;
    data?: Record<string, unknown>;
}

export interface Location {
    x: number;
    y: number;
    z: number;
}

export interface Turtle {
    id: number;
    name: string;
    fuelLevel: number;
    fuelLimit: number;
    selectedSlot: number;
    inventory: Inventory;
    stepsSinceLastRefuel: number;
    state: BaseState | null;
    location: Location;
    direction: Direction;
}
