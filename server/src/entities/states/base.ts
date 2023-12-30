import {Location} from '../../db/turtle.type';
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
    public abstract warning: string | null;

    protected readonly turtle: Turtle;

    constructor(turtle: Turtle) {
        this.turtle = turtle;
    }

    public abstract act(): Promise<void>;

    protected async moveToNode(s: Node): Promise<[true, undefined] | [false, string]> {
        const {x, y, z} = this.turtle.location as Location;
        if (s.point.y - y > 0) {
            const [didMoveUp, upMessage] = await this.turtle.up();
            if (didMoveUp) return [true, undefined];

            if (upMessage === 'Out of fuel') {
                await this.turtle.getFuelLevel();
                return [false, upMessage];
            }

            // We don't know what the other potential errors are!
            if (upMessage !== 'Movement obstructed') return [false, upMessage as string];

            if (!s.isMineable) {
                await this.turtle.inspectUp();
                return [false, upMessage];
            }

            const [didDigUp, didDigUpMessage] = await this.turtle.digUp();
            if (!didDigUp) {
                await this.turtle.inspectUp();
                return [false, didDigUpMessage as string];
            }
            
            await this.turtle.suckUp();
            const [didMoveUpAfterDig, moveDownAfterDigMessage] = await this.turtle.up();
            if (didMoveUpAfterDig) return [true, undefined];

            await this.turtle.inspectUp();
            return [false, moveDownAfterDigMessage as string];
        } else if (s.point.y - y < 0) {
            const [didMoveDown, downMessage] = await this.turtle.down();
            if (didMoveDown) return [true, undefined];

            if (downMessage === 'Out of fuel') {
                await this.turtle.getFuelLevel();
                return [false, downMessage];
            }

            // We don't know what the other potential errors are!
            if (downMessage !== 'Movement obstructed') return [false, downMessage as string];

            if (!s.isMineable) {
                await this.turtle.inspectDown();
                return [false, downMessage];
            }

            const [didDigDown, digDownMessage] = await this.turtle.digDown();
            if (!didDigDown) {
                await this.turtle.inspectDown();
                return [false, digDownMessage as string];
            }

            await this.turtle.suckDown();
            const [didMoveDownAfterDig, moveDownAfterDigMessage] = await this.turtle.down();
            if (didMoveDownAfterDig) return [true, undefined];

            await this.turtle.inspectDown();
            return [false, moveDownAfterDigMessage as string];
        } else {
            const heading = {x: s.point.x - x, y: s.point.y - y, z: s.point.z - z};
            const direction = heading.x + Math.abs(heading.x) * 2 + (heading.z + Math.abs(heading.z) * 3);
            await this.turtle.turnToDirection(direction);

            const [didMoveForward, forwardMessage] = await this.turtle.forward();
            if (didMoveForward) return [true, undefined];

            if (forwardMessage === 'Out of fuel') {
                await this.turtle.getFuelLevel();
                return [false, forwardMessage];
            }

            // We don't know what the other potential errors are!
            if (forwardMessage !== 'Movement obstructed') return [false, forwardMessage as string]

            if (!s.isMineable) {
                await this.turtle.inspect();
                return [false, forwardMessage];
            }

            const [didDig, digMessage] = await this.turtle.dig();
            if (!didDig) {
                await this.turtle.inspect();
                return [false, digMessage as string];
            }

            await this.turtle.suck();

            const [didMoveForwardAfterDig, forwardMessageAfterDig] = await this.turtle.forward();
            if (didMoveForwardAfterDig) return [true, undefined];
            
            await this.turtle.inspect();
            return [false, forwardMessageAfterDig as string];
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
