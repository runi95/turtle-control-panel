import {Node} from '../../dlite/Node';
import {Turtle} from '../turtle';
import {TURTLE_STATES} from './helpers';

export type StateData<T> = {
    [Property in keyof T]: string | number | StateData<T>;
} & {
    readonly id: TURTLE_STATES;
}

export abstract class TurtleBaseState<T extends StateData<T>> {
    public abstract readonly name: string;
    public abstract data: T;
    public abstract error: string | null;

    protected readonly turtle: Turtle;

    constructor(turtle: Turtle) {
        this.turtle = turtle;
    }

    public abstract act(): Promise<void>;

    protected async moveToNode(s: Node): Promise<boolean> {
        const {x, y, z} = this.turtle.location;
        if (s.point.y - y > 0) {
            const [didMoveUp] = await this.turtle.up();
            if (didMoveUp) {
                return true;
            }

            if (s.isMineable) {
                await this.turtle.digUp();
                await this.turtle.suckUp();
                await this.turtle.up();
                return true;
            } else {
                return false;
            }
        } else if (s.point.y - y < 0) {
            const [didMoveDown] = await this.turtle.down();
            if (didMoveDown) {
                return true;
            }

            if (s.isMineable) {
                await this.turtle.digDown();
                await this.turtle.suckDown();
                const [didMoveDown] = await this.turtle.down();
                if (!didMoveDown) {
                    return false;
                }
                return true;
            } else {
                return false;
            }
        } else {
            const heading = {x: s.point.x - x, y: s.point.y - y, z: s.point.z - z};
            const direction = heading.x + Math.abs(heading.x) * 2 + (heading.z + Math.abs(heading.z) * 3);
            await this.turtle.turnToDirection(direction);

            const [didMoveForward] = await this.turtle.forward();
            if (didMoveForward) return true;

            if (s.isMineable) {
                const [didDig, digMessage] = await this.turtle.dig();
                if (!didDig) {
                    this.error = digMessage as string;
                    return false;
                }

                await this.turtle.suck();

                const [didMoveForward, moveForwardMessage] = await this.turtle.forward();
                if (!didMoveForward) {
                    this.error = moveForwardMessage as string;
                    return false;
                }

                return true;
            } else {
                return false;
            }
        }
    }

    protected hasSpaceForItem(name: string, count = 1) {
        const inventoryEntries = Object.entries(this.turtle.inventory);
        if (inventoryEntries.length < 16) return true;

        return (
            inventoryEntries.reduce((remainingCount, [_, item]) => {
                if (!item) return 0;
                if (item.name !== name) return remainingCount;
                if (!item.maxCount || !item.maxCount) return remainingCount;

                return remainingCount - (item.maxCount - item.count);
            }, count) <= 0
        );
    }

    protected async selectItemOfType(name: string) {
        const itemOfType = Object.entries(this.turtle.inventory).find(([_, item]) => item?.name === name);
        if (itemOfType === undefined) return false;

        const [key] = itemOfType;
        await this.turtle.select(Number(key));
        return true;
    }
}
