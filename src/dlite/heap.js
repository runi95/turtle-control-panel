const HeapElement = require('./heapElement');
const K = require('./k');

module.exports = class Heap {
    constructor(cap) {
        this.n = 0;
        this.heap = new Array(cap);
        this.hash = {};
    }

    TopKey() {
        if (this.n == 0) return new K(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        return this.heap[1].k;
    }

    Pop() {
        if (this.n == 0) return undefined;
        const s = this.heap[1].s;
        this.heap[1] = this.heap[this.n];
        const heapS = this.heap[1].s;
        this.hash[`${heapS.x},${heapS.y},${heapS.z}`] = 1;
        this.hash[`${s.x},${s.y},${s.z}`] = 0;
        this.n--;
        this.moveDown(1);
        return s;
    }

    Insert(s, k) {
        const e = new HeapElement(s, k);
        this.n++;
        this.hash[`${s.x},${s.y},${s.z}`] = this.n;
        if (this.n == this.heap.Length) this.increaseCap();
        this.heap[this.n] = e;
        this.moveUp(this.n);
    }

    Update(s, k) {
        const i = this.hash[`${s.x},${s.y},${s.z}`];
        if (i == 0) return;
        const kold = this.heap[i].k;
        this.heap[i].k = k;
        if (kold.CompareTo(k) < 0) {
            this.moveDown(i);
        } else {
            this.moveUp(i);
        }
    }

    Remove(s) {
        const i = this.hash[`${s.x},${s.y},${s.z}`];
        if (i == 0) return;
        this.hash[`${s.x},${s.y},${s.z}`] = 0;
        this.heap[i] = this.heap[this.n];
        const heapS = this.heap[i].s;
        this.hash[`${heapS.x},${heapS.y},${heapS.z}`] = i;
        this.n--;
        this.moveDown(i);
    }

    Contains(s) {
        const i = this.hash[`${s.x},${s.y},${s.z}`];
        return i !== undefined && i !== 0;
    }

    moveDown(i) {
        const childL = i * 2;
        if (childL > this.n) return;
        const childR = i * 2 + 1;
        let smallerChild;
        if (childR > this.n) {
            smallerChild = childL;
        } else if (this.heap[childL].k.CompareTo(this.heap[childR].k) < 0) {
            smallerChild = childL;
        } else {
            smallerChild = childR;
        }

        if (this.heap[i].k.CompareTo(this.heap[smallerChild].k) > 0) {
            this.swap(i, smallerChild);
            this.moveDown(smallerChild);
        }
    }

    moveUp(i) {
        if (i == 1) return;
        const parent = Math.floor(i / 2);
        if (this.heap[parent].k.CompareTo(this.heap[i].k) > 0) {
            this.swap(parent, i);
            this.moveUp(parent);
        }
    }

    swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        const heapS = this.heap[j].s;
        this.hash[`${heapS.x},${heapS.y},${heapS.z}`] = i;
        this.heap[j] = temp;
        this.hash[`${temp.s.x},${temp.s.y},${temp.s.z}`] = j;
    }

    /*
    increaseCap() {
        Array.Resize<HeapElement>(ref heap, heap.Length * 2);
    }
    */
};
