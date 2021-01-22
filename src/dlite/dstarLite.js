const State = require('./state');
const K = require('./k');
const Heap = require('./heap');
const Coordinates = require('./coordinates');

module.exports = class DStarLite {
    constructor() {
        this.U = undefined;
        this.S = undefined;
        this.km = undefined;
        this.sgoal = undefined;
        this.sstart = undefined;
    }

    async RunDStarLite(sx, sy, sz, gx, gy, gz, env) {
        this.sstart = new State();
        this.sstart.x = sx;
        this.sstart.y = sy;
        this.sstart.z = sz;
        this.sgoal = new State();
        this.sgoal.x = gx;
        this.sgoal.y = gy;
        this.sgoal.z = gz;
        let slast = this.sstart;
        this.Initialize(await env.GetInitialObstacles());
        this.ComputeShortestPath();
        while (!this.sstart.Equals(this.sgoal)) {
            if (this.sstart.g === Number.POSITIVE_INFINITY) {
                throw new Error('Goal is unreachable');
            }

            const obstacleCoord = await env.GetObstaclesInVision();
            const oldkm = this.km;
            const oldslast = slast;
            this.km += this.Heuristic(this.sstart, slast);
            slast = this.sstart;
            let change = false;
            for (let i = 0; i < obstacleCoord.length; i++) {
                const c = obstacleCoord[i];
                const s = this.S.get(c.x, c.y, c.z);

                if (s.obstacle) continue; // is already known
                change = true;
                s.obstacle = true;
                const pred = s.GetPred(this.S);
                for (let j = 0; j < pred.length; j++) {
                    const p = pred[j];
                    this.UpdateVertex(p);
                }
            }
            if (!change) {
                this.km = oldkm;
                slast = oldslast;
            }
            const possibleMoveLocation = this.MinSuccState(this.sstart);
            const didMove = await env.MoveTo(new Coordinates(possibleMoveLocation.x, possibleMoveLocation.y, possibleMoveLocation.z));
            if (didMove) {
                this.sstart = possibleMoveLocation;
            } else {
                // possibleMoveLocation.obstacle = true;
            }
            this.ComputeShortestPath();
        }
    }

    CalculateKey(s) {
        return new K(this.min(s.g, s.rhs) + this.Heuristic(s, this.sstart) + this.km, this.min(s.g, s.rhs));
    }

    Heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
    }

    Initialize(initialObstacles) {
        this.U = new Heap();
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
        this.U.Insert(this.sgoal, this.CalculateKey(this.sgoal));
    }

    UpdateVertex(u) {
        if (!u.Equals(this.sgoal)) {
            u.rhs = this.MinSucc(u);
        }
        if (this.U.Contains(u)) {
            this.U.Remove(u);
        }
        if (u.g != u.rhs) {
            this.U.Insert(u, this.CalculateKey(u));
        }
    }

    MinSuccState(u) {
        let min = Number.POSITIVE_INFINITY;
        let n;
        const uS = u.GetSucc(this.S);
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

    MinSucc(u) {
        let min = Number.POSITIVE_INFINITY;
        const uS = u.GetSucc(this.S);
        for (let i = 0; i < uS.length; i++) {
            const s = uS[i];
            const val = 1 + s.g;
            if (val < min && !s.obstacle) min = val;
        }
        return min;
    }

    ComputeShortestPath() {
        let loop = 0;
        while (this.U.TopKey().CompareTo(this.CalculateKey(this.sstart)) < 0 || this.sstart.rhs != this.sstart.g) {
            // if (loop > 15000) {
            //     throw new Error("Can't find path");
            // }

            console.log(loop);
            const kold = this.U.TopKey();
            const u = this.U.Pop();
            if (u == undefined) break;
            if (kold.CompareTo(this.CalculateKey(u)) < 0) {
                this.U.Insert(u, this.CalculateKey(u));
            } else if (u.g > u.rhs) {
                u.g = u.rhs;
                const uPred = u.GetPred(this.S);
                for (let i = 0; i < uPred.length; i++) {
                    const s = uPred[i];
                    this.UpdateVertex(s);
                }
            } else {
                u.g = Number.POSITIVE_INFINITY;
                this.UpdateVertex(u);
                const uPred = u.GetPred(this.S);
                for (let i = 0; i < uPred.length; i++) {
                    const s = uPred[i];
                    this.UpdateVertex(s);
                }
            }

            loop++;
        }
    }

    min(a, b) {
        if (b < a) return b;
        return a;
    }
};
