import {Area} from './area.type';
import {Block} from './block.type';
import {Turtle} from './turtle.type';

export interface Server {
    id: number;
    remoteAddress: string;
    turtles: Turtle[];
    areas: Area[];
    blocks: Block[];
}
