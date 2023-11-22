export default class Pair<K, V> {
    public readonly first: K;
    public readonly second: V;

    constructor(first: K, second: V) {
        this.first = first;
        this.second = second;
    }

    compareTo(that: Pair<K, V>) {
        if (this.first < that.first) return -1;
        else if (this.first > that.first) return 1;
        if (this.second > that.second) return 1;
        else if (this.second < that.second) return -1;
        return 0;
    }
}
