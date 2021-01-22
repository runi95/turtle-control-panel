module.exports = class State {
    constructor(x = 0, y = 0, z = 0, g = 0, rhs = 0, obstacle = false) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.g = g;
        this.rhs = rhs;
        this.obstacle = obstacle;
    }

    Equals(that) {
        return this.x == that.x && this.y == that.y && this.z === that.z;
    }

    GetSucc(S) {
        /*
        return [
            S.get(this.x + 1, this.y, this.z),
            S.get(this.x, this.y + 1, this.z),
            S.get(this.x, this.y, this.z + 1),
            S.get(this.x - 1, this.y, this.z),
            S.get(this.x, this.y - 1, this.z),
            S.get(this.x, this.y, this.z - 1),
        ];
        */
        return this.GetPred(S);
    }

    GetPred(S) {
        const s = [];
        let tempState;
        tempState = S.get(this.x + 1, this.y, this.z);
        if (!tempState.obstacle) s.unshift(tempState);
        tempState = S.get(this.x, this.y + 1, this.z);
        if (!tempState.obstacle) s.unshift(tempState);
        tempState = S.get(this.x, this.y, this.z + 1);
        if (!tempState.obstacle) s.unshift(tempState);
        tempState = S.get(this.x - 1, this.y, this.z);
        if (!tempState.obstacle) s.unshift(tempState);
        tempState = S.get(this.x, this.y - 1, this.z);
        if (!tempState.obstacle) s.unshift(tempState);
        tempState = S.get(this.x, this.y, this.z - 1);
        if (!tempState.obstacle) s.unshift(tempState);
        return s;
    }
};
