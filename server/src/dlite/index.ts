import {PriorityQueue} from './PriorityQueue';
import {Node} from './Node';
import {Point} from './Point';
import {getBlock} from '../db';
import {Block} from '../db/block.type';
import logger from '../logger/server';

export class DestinationError extends Error {
    public readonly node: Node;

    constructor(node: Node, message?: string) {
        super(message);
        this.node = node;
    }
}

const heuristic = {
    calculate(a: Point, b: Point): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    },
};

export type IsBlockMineableFunc = (x: number, y: number, z: number, block: Block | null) => boolean;
export type Boundaries = {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    minZ?: number;
    maxZ?: number;
};

export interface DStarLiteOptions {
    maxSteps?: number;
    isBlockMineableFunc?: IsBlockMineableFunc;
    boundaries?: Boundaries;
}

export default class DStarLite {
    private readonly maxSteps: number;
    private readonly serverId: number;
    private readonly cachedBlocks = new Map<string, Block | null>();
    private readonly isBlockMineableFunc: IsBlockMineableFunc | null;
    private readonly boundaries: Boundaries | null;

    constructor(serverId: number, options?: DStarLiteOptions) {
        this.serverId = serverId;
        this.maxSteps = options?.maxSteps ?? 80000;
        this.isBlockMineableFunc = options?.isBlockMineableFunc ?? null;
        this.boundaries = options?.boundaries ?? null;
    }

    public async search(source: Point, destinations: Point[]): Promise<Node | null> {
        if (destinations.length === 0) return null;
        if (destinations.some((d) => d.x === source.x && d.y === source.y && d.z === source.z)) return null;

        const startNode = new Node(source, false, false);
        const cachedNodes = new Map<string, Node>();
        cachedNodes.set(`${source.x},${source.y},${source.z}`, startNode);

        const compareKey = (a: [number, number], b: [number, number]) => {
            if (a[0] > b[0]) {
                return 1;
            }

            if (a[0] < b[0]) {
                return -1;
            }

            if (a[1] > b[1]) {
                return 1;
            }

            if (a[1] < b[1]) {
                return -1;
            }

            return 0;
        };
        const compareNodes = (a: Node, b: Node) => compareKey(a.key, b.key);

        const openHeap = new PriorityQueue<Node>(compareNodes);
        const destinationNodes: Node[] = [];
        for (const destination of destinations) {
            const destinationNode = this.getCachedNode(cachedNodes, destination.x, destination.y, destination.z);
            cachedNodes.set(`${destination.x},${destination.y},${destination.z}`, destinationNode);
    
            destinationNode.rhs = 0;
            destinationNode.key = [heuristic.calculate(startNode.point, destinationNode.point), 0];
            openHeap.add(destinationNode);
            destinationNodes.push(destinationNode);
        }

        const updateVertex = (u: Node) => {
            openHeap.remove(u);

            if (u.g !== u.rhs) {
                u.key = this.calculateKey(u, startNode);
                openHeap.add(u);
            }
        };

        let u: Node | null;
        let steps = 0;
        while ((u = openHeap.poll()) !== null) {
            if (steps++ > this.maxSteps) {
                logger.debug(`Reached max steps of ${this.maxSteps}`);
                throw new DestinationError(u, 'Max steps reached');
            }

            u.visited = true;
            if (compareNodes(u, startNode) >= 0) break;
            if (startNode.rhs > startNode.g) break;
            const k_old = u.key;
            const k_new = this.calculateKey(u, startNode);

            if (compareKey(k_old, k_new) === -1) {
                u.key = k_new;
                openHeap.add(u);
            } else if (u.g > u.rhs) {
                u.g = u.rhs;
                const pred: Node[] = this.succ(u, cachedNodes);
                for (const s of pred) {
                    s.parent = u;
                    if (!destinationNodes.includes(s)) {
                        s.rhs = Math.min(s.rhs, this.c(s, u) + u.g);
                    }

                    updateVertex(s);
                }
            } else {
                const g_old = u.g;
                u.g = Number.POSITIVE_INFINITY;
                const pred: Node[] = this.succ(u, cachedNodes);
                pred.push(u);
                for (const s of pred) {
                    if (s.rhs === this.c(s, u) + g_old) {
                        if (!destinationNodes.includes(s)) {
                            let min_s = Number.POSITIVE_INFINITY;
                            let nparent = null;
                            const succ: Node[] = this.succ(u, cachedNodes);
                            for (const s_ of succ) {
                                const temp = this.c(s, s_) + s_.g;
                                if (min_s > temp) {
                                    nparent = s_;
                                    min_s = temp;
                                }
                            }

                            s.rhs = min_s;
                            s.parent = nparent;
                        }
                    }

                    updateVertex(u);
                }
                openHeap.add(u);
            }
        }

        if (startNode.rhs < Number.POSITIVE_INFINITY) {
            return startNode.parent;
        }

        logger.debug(`No valid path to: ${destinations.map(({x, y, z}) => `(${x},${y},${z})`).join(', ')}`);
        throw new DestinationError(startNode, 'No valid path found');;
    }

    private calculateKey(s: Node, start: Node): [number, number] {
        const h = heuristic.calculate(start.point, s.point);
        return [
            Math.min(s.g, s.rhs) + h, // + k_m?
            Math.min(s.g, s.rhs),
        ];
    }

    private c(u: Node, v: Node): number {
        if ((u.isWall && !u.isMineable) || (v.isWall && !v.isMineable)) return Number.POSITIVE_INFINITY;
        return heuristic.calculate(u.point, v.point);
    }

    private getCachedBlock(x: number, y: number, z: number): Block | null {
        const blockPath = `${x},${y},${z}`;
        const cachedBlock = this.cachedBlocks.get(blockPath);
        if (cachedBlock !== undefined) return cachedBlock;
        const block = getBlock(this.serverId, x, y, z);
        this.cachedBlocks.set(blockPath, block);
        return block;
    }

    private getCachedNode(cachedNodes: Map<string, Node>, x: number, y: number, z: number): Node {
        const nodePath = `${x},${y},${z}`;
        const cachedNode = cachedNodes.get(nodePath);
        if (cachedNode) return cachedNode;
        const block = getBlock(this.serverId, x, y, z);
        if (block == null || block.name === 'minecraft:water') {
            const node = new Node(new Point(x, y, z), false, this.isBlockMineableFunc !== null ? this.isBlockMineableFunc(x, y, z, block) : false);
            cachedNodes.set(nodePath, node);
            return node;
        }

        const node = new Node(new Point(x, y, z), true, this.isBlockMineableFunc !== null ? this.isBlockMineableFunc(x, y, z, block) : false);
        cachedNodes.set(nodePath, node);
        return node;
    }

    private succ(u: Node, cachedNodes: Map<string, Node>): Node[] {
        const neighbors: Node[] = [];

        if (this.boundaries?.maxX == null || u.point.x + 1 <= this.boundaries.maxX) {
            const east = this.getCachedNode(cachedNodes, u.point.x + 1, u.point.y, u.point.z);
            if (!east.visited) neighbors.push(east); 
        }

        if (u.point.y < 255 && (this.boundaries?.maxY == null || u.point.y + 1 <= this.boundaries.maxY)) {
            const up = this.getCachedNode(cachedNodes, u.point.x, u.point.y + 1, u.point.z);
            if (!up.visited) neighbors.push(up); 
        }

        if (this.boundaries?.maxZ == null || u.point.z + 1 <= this.boundaries.maxZ) {
            const south = this.getCachedNode(cachedNodes, u.point.x, u.point.y, u.point.z + 1);
            if (!south.visited) neighbors.push(south); 
        }

        if (this.boundaries?.minX == null || u.point.x - 1 >= this.boundaries.minX) {
            const west = this.getCachedNode(cachedNodes, u.point.x - 1, u.point.y, u.point.z);
            if (!west.visited) neighbors.push(west);
        }

        if (u.point.y > -59 && (this.boundaries?.minY == null || u.point.y - 1 >= this.boundaries.minY)) {
            const down = this.getCachedNode(cachedNodes, u.point.x, u.point.y - 1, u.point.z);
            if (!down.visited) neighbors.push(down); 
        }

        if (this.boundaries?.minZ == null || u.point.z - 1 >= this.boundaries.minZ) {
            const north = this.getCachedNode(cachedNodes, u.point.x, u.point.y, u.point.z - 1);
            if (!north.visited) neighbors.push(north);
        }

        return neighbors;
    }
}
