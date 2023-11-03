const Element = require('./Element');

module.exports = class PriorityQueue {
    constructor() {
        this.hash = {};
        this.queue = [];
        this.size = 0;
    }

    siftDown(k, x) {
        const half = this.size >>> 1;
        while (k < half) {
            let child = (k << 1) + 1;
            let c = this.queue[child];
            const right = child + 1;
            if (right < this.size && c.compareTo(this.queue[right]) > 0) c = this.queue[(child = right)];
            if (x.compareTo(c) <= 0) break;
            this.queue[k] = c;
            this.hash[c.hashCode()] = k;
            k = child;
        }
        this.queue[k] = x;
        this.hash[x.hashCode()] = k;
    }

    isEmpty() {
        return this.size === 0;
    }

    poll() {
        if (this.size === 0) {
            return null;
        }

        const s = --this.size;
        const result = this.queue[0];
        const x = this.queue.pop();
        delete this.hash[result.hashCode()];
        if (s !== 0) {
            this.siftDown(0, x);
        }

        return result;
    }

    peek() {
        return this.size === 0 ? null : this.queue[0];
    }

    siftUp(k, x) {
        while (k > 0) {
            const parent = (k - 1) >>> 1;
            const e = this.queue[parent];
            if (x.compareTo(e) >= 0) break;
            if (k === this.size - 1) {
                this.queue.push(e);
                this.hash[e.hashCode()] = k;
            } else {
                this.queue[k] = e;
                this.hash[e.hashCode()] = k;
            }
            k = parent;
        }
        this.queue[k] = x;
        this.hash[x.hashCode()] = k;
    }

    offer(e) {
        const i = this.size++;
        if (i === 0) {
            this.hash[e.hashCode()] = 0;
            this.queue.push(e);
        } else {
            this.siftUp(i, e);
        }
        return true;
    }

    add(e, k) {
        if (e === undefined) {
            throw new Error("Can't add undefined");
        }

        if (this.contains(e)) {
            this.remove(e);
        }
        return this.offer(new Element(e, k));
    }

    remove(e) {
        const removedHashCode = e.hashCode();
        const i = this.hash[removedHashCode];
        const s = --this.size;
        const moved = this.queue.pop();
        delete this.hash[removedHashCode];
        if (s !== i) {
            this.siftDown(i, moved);
            if (this.queue[i].compareTo(moved) === 0) {
                this.siftUp(i, moved);
            }
        }
    }

    contains(s) {
        return this.hash[s.hashCode()] !== undefined;
    }

    clear() {
        this.queue = [];
        this.hash = {};
        this.size = 0;
    }
};
