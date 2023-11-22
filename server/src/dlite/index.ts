import State from './State';
import Pair from './Pair';
import Coordinates from './Coordinates';
import PriorityQueue from './PriorityQueue';
import logger from '../logger/server';

export default class DStarLite {
    constructor(maxSteps = 80000) {
        this.maxSteps = maxSteps;
        this.U = undefined;
        this.S = undefined;
        this.km = undefined;
        this.sgoal = undefined;
        this.sstart = undefined;
    }

    async runDStarLite(sx, sy, sz, gx, gy, gz, env) {
        this.sstart = new State();
        this.sstart.x = sx;
        this.sstart.y = sy;
        this.sstart.z = sz;
        this.sgoal = new State();
        this.sgoal.x = gx;
        this.sgoal.y = gy;
        this.sgoal.z = gz;
        let slast = this.sstart;
        this.initialize(await env.getInitialObstacles());
        try {
            this.computeShortestPath();
        } catch (err) {}
        while (!this.sstart.equals(this.sgoal)) {
            if (this.sstart.g === Number.POSITIVE_INFINITY) {
                return false;
            }

            const obstacleCoord = await env.getObstaclesInVision();
            const oldkm = this.km;
            const oldslast = slast;
            this.km += this.heuristic(this.sstart, slast);
            slast = this.sstart;
            let change = false;
            for (let i = 0; i < obstacleCoord.length; i++) {
                const c = obstacleCoord[i];
                const s = this.S.get(c.x, c.y, c.z);

                if (s.obstacle) continue; // is already known
                change = true;
                s.obstacle = true;
                const pred = s.getPred(this.S);
                for (let j = 0; j < pred.length; j++) {
                    const p = pred[j];
                    this.updateVertex(p);
                }
            }
            if (!change) {
                this.km = oldkm;
                slast = oldslast;
            }
            const possibleMoveLocation = this.minSuccState(this.sstart);
            if (possibleMoveLocation === undefined) {
                return false;
            }
            const didMove = await env.moveTo(
                new Coordinates(possibleMoveLocation.x, possibleMoveLocation.y, possibleMoveLocation.z)
            );
            if (didMove) {
                this.sstart = possibleMoveLocation;
            } else {
                // possibleMoveLocation.obstacle = true;
            }

            try {
                this.computeShortestPath();
            } catch (err) {
                logger.error(err);
                return false;
            }
        }

        return true;
    }

    calculateKey(s) {
        return new Pair(Math.min(s.g, s.rhs) + this.heuristic(s, this.sstart) + this.km, Math.min(s.g, s.rhs));
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
    }

    initialize(initialObstacles) {
        this.U = new PriorityQueue();
        this.S = {
            get: (x, y, z) => {
                const pos = `${x},${y},${z}`;
                let s = this.S[pos];
                if (s === undefined) {
                    s = new State();
                    s.x = x;
                    s.y = y;
                    s.z = z;
                    s.g = Number.POSITIVE_INFINITY;
                    s.rhs = Number.POSITIVE_INFINITY;

                    this.S[pos] = s;
                }

                return s;
            },
            add: (s) => {
                this.S[`${s.x},${s.y},${s.z}`] = s;
            },
        };
        this.km = 0;

        for (let i = 0; i < initialObstacles.length; i++) {
            const s = this.S.get(initialObstacles[i].x, initialObstacles[i].y, initialObstacles[i].z);
            s.obstacle = true;
        }

        this.sgoal = this.S.get(this.sgoal.x, this.sgoal.y, this.sgoal.z);
        this.sstart = this.S.get(this.sstart.x, this.sstart.y, this.sstart.z);
        this.sgoal.rhs = 0;
        this.U.add(this.sgoal, this.calculateKey(this.sgoal));
    }

    updateVertex(u) {
        if (!u.equals(this.sgoal)) {
            u.rhs = this.minSucc(u);
        }
        if (this.U.contains(u)) {
            this.U.remove(u);
        }
        if (u.g != u.rhs) {
            this.U.add(u, this.calculateKey(u));
        }
    }

    minSuccState(u) {
        let min = Number.POSITIVE_INFINITY;
        let n;
        const uS = u.getSucc(this.S);
        for (let i = 0; i < uS.length; i++) {
            const s = uS[i];
            const val = s.g + 1;
            if (val <= min && !s.obstacle) {
                min = val;
                n = s;
            }
        }

        return n;
    }

    minSucc(u) {
        let min = Number.POSITIVE_INFINITY;
        const uS = u.getSucc(this.S);
        for (let i = 0; i < uS.length; i++) {
            const s = uS[i];
            const val = 1 + s.g;
            if (val < min && !s.obstacle) min = val;
        }
        return min;
    }

    computeShortestPath() {
        let steps = 0;
        let u;
        while (
            ((u = this.U.peek()) && u.k.compareTo(this.calculateKey(this.sstart)) < 0) ||
            this.sstart.rhs != this.sstart.g
        ) {
            if (steps++ > this.maxSteps) {
                throw new Error('Maximum number of path steps exceeded');
            }

            const kold = this.U.peek().k;
            const u = this.U.poll().s;
            if (u == undefined) break;
            if (kold.compareTo(this.calculateKey(u)) < 0) {
                this.U.add(u, this.calculateKey(u));
            } else if (u.g > u.rhs) {
                u.g = u.rhs;
                const uPred = u.getPred(this.S);
                for (let i = 0; i < uPred.length; i++) {
                    const s = uPred[i];
                    this.updateVertex(s);
                }
            } else {
                u.g = Number.POSITIVE_INFINITY;
                this.updateVertex(u);
                const uPred = u.getPred(this.S);
                for (let i = 0; i < uPred.length; i++) {
                    const s = uPred[i];
                    this.updateVertex(s);
                }
            }
        }

        if (u === null) {
            throw new Error('Path is unreachable');
        }
    }
}
