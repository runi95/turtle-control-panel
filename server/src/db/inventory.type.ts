import {Inventory} from './turtle.type';

export interface ExternalInventory {
    serverId: number;
    x: number;
    y: number;
    z: number;
    content: Inventory;
    size: number;
}
