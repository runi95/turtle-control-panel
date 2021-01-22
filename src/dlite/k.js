module.exports = class K {
    constructor(k1, k2) {
        this.k1 = k1;
        this.k2 = k2;
    }

    CompareTo(that) {
        if (this.k1 < that.k1) return -1;
        else if (this.k1 > that.k1) return 1;
        if (this.k2 > that.k2) return 1;
        else if (this.k2 < that.k2) return -1;
        return 0;
    }
};
