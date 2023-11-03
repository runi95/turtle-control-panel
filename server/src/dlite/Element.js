module.exports = class Element {
    constructor(state, key) {
        this.s = state;
        this.k = key;
    }

    compareTo(that) {
        return this.k.compareTo(that.k);
    }

    hashCode() {
        return this.s.hashCode();
    }
};
