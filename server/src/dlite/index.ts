import {PriorityQueue} from './PriorityQueue';
import {Node} from './Node';
import {Point} from './Point';
import {getBlock} from '../db';

const heuristic = {
    calculate(a: Point, b: Point): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
    },
};

export default class DStarLite {
    private readonly maxSteps: number;
    private readonly serverId: number;
    private readonly cachedNodes = new Map<string, Node>();

    constructor(serverId: number, maxSteps = 80000) {
        this.maxSteps = maxSteps;
        this.serverId = serverId;
    }

    public updateNodeState(point: Point, isWall: boolean) {
        this.cachedNodes.set(`${point.x},${point.y},${point.z}`, new Node(point, isWall));
    }

    public async search(source: Point, destination: Point) {
        const startNode = new Node(source, false);
        this.cachedNodes.set(`${source.x},${source.y},${source.z}`, startNode);
        const destinationNode = new Node(destination, false);
        this.cachedNodes.set(`${destination.x},${destination.y},${destination.z}`, destinationNode);

        destinationNode.rhs = 0;
        destinationNode.key = [heuristic.calculate(startNode.point, destinationNode.point), 0];

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
        openHeap.add(destinationNode);

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
            if (steps++ > this.maxSteps) throw new Error(`Reached max steps of ${this.maxSteps}`);

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
                const pred: Node[] = this.succ(u);
                for (const s of pred) {
                    s.parent = u;
                    if (s !== destinationNode) {
                        s.rhs = Math.min(s.rhs, this.c(s, u) + u.g);
                    }

                    updateVertex(s);
                }
            } else {
                const g_old = u.g;
                u.g = Number.POSITIVE_INFINITY;
                const pred: Node[] = this.succ(u);
                pred.push(u);
                for (const s of pred) {
                    if (s.rhs === this.c(s, u) + g_old) {
                        if (s !== destinationNode) {
                            let min_s = Number.POSITIVE_INFINITY;
                            let nparent = null;
                            const succ: Node[] = this.succ(u);
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
            let curr = startNode.parent as Node;
            const ret: Point[] = [];
            while (curr.parent) {
                ret.push(curr.point);
                curr = curr.parent;
            }

            if (!destinationNode.isWall) {
                ret.push(destination);
            }
            
            return ret;
        }

        throw new Error('No valid path');
    }

    private calculateKey(s: Node, start: Node): [number, number] {
        const h = heuristic.calculate(start.point, s.point);
        return [
            Math.min(s.g, s.rhs) + h, // + k_m?
            Math.min(s.g, s.rhs),
        ];
    }

    private c(u: Node, v: Node): number {
        if (u.isWall || v.isWall) return Number.POSITIVE_INFINITY;
        return heuristic.calculate(u.point, v.point);
    }

    private getCachedNode(x: number, y: number, z: number): Node {
        const nodePath = `${x},${y},${z}`;
        const cachedNode = this.cachedNodes.get(nodePath);
        if (cachedNode) return cachedNode;
        const block = getBlock(this.serverId, x, y, z);
        if (!block) {
            const node = new Node(new Point(x, y, z), false);
            this.cachedNodes.set(nodePath, node);
            return node;
        }

        const node = new Node(new Point(x, y, z), true);
        this.cachedNodes.set(nodePath, node);
        return node;
    }

    private succ(u: Node): Node[] {
        const neighbors: Node[] = [];

        const east = this.getCachedNode(u.point.x + 1, u.point.y, u.point.z);
        if (!east.visited) neighbors.push(east); 
        if (u.point.y < 255) {
            const up = this.getCachedNode(u.point.x, u.point.y + 1, u.point.z);
            if (!up.visited) neighbors.push(up); 
        }
        const south = this.getCachedNode(u.point.x, u.point.y, u.point.z + 1);
        if (!south.visited) neighbors.push(south); 
        const west = this.getCachedNode(u.point.x - 1, u.point.y, u.point.z);
        if (!west.visited) neighbors.push(west);
        if (u.point.y > -59) {
            const down = this.getCachedNode(u.point.x, u.point.y - 1, u.point.z);
            if (!down.visited) neighbors.push(down); 
        }
        const north = this.getCachedNode(u.point.x, u.point.y, u.point.z - 1);
        if (!north.visited) neighbors.push(north);

        return neighbors;
    }
}
