module.exports = class Pair {
    constructor(first, second) {
        this.first = first;
        this.second = second;
    }

    compareTo(that) {
        if (this.first < that.first) return -1;
        else if (this.first > that.first) return 1;
        if (this.second > that.second) return 1;
        else if (this.second < that.second) return -1;
        return 0;
    }
};
