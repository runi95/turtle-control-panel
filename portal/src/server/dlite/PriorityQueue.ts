export class PriorityQueue<T> {
    private _size = 0;
    private _queue: T[] = [];
    private readonly comparator: (a: T, b: T) => number = (a: T, b: T) => {
        if (a > b) {
            return 1;
        }

        if (a < b) {
            return -1;
        }

        return 0;
    };

    constructor(comparator?: (a: T, b: T) => number) {
        if (comparator) {
            this.comparator = comparator;
        }
    }

    public add(e: T): boolean {
        return this.offer(e);
    }

    public offer(e: T): boolean {
        const i = this._size;
        this._size++;
        if (i === 0) {
            this._queue[0] = e;
        } else {
            this.siftUp(i, e);
        }

        return true;
    }

    private siftUp(k: number, key: T): void {
        while (k > 0) {
            const parent = (k - 1) >>> 1;
            const e = this._queue[parent];
            if (this.comparator(key, e) >= 0) break;

            this._queue[k] = e;
            k = parent;
        }
        this._queue[k] = key;
    }

    private siftDown(k: number, key: T): void {
        const half = this._size >>> 1;
        while (k < half) {
            let child = (k << 1) + 1;
            let c = this._queue[child];
            const right = child + 1;
            if (right < this._size && this.comparator(c, this._queue[right]) > 0) {
                c = this._queue[(child = right)];
            }
            if (this.comparator(key, c) <= 0) break;

            this._queue[k] = c;
            k = child;
        }

        this._queue[k] = key;
    }

    public poll(): T | null {
        if (this._size === 0) return null;

        const s = --this._size;
        const result = this._queue[0];
        const x = this._queue[s];
        this._queue.pop();
        if (s !== 0) {
            this.siftDown(0, x);
        }

        return result;
    }

    public remove(o: T): boolean {
        const i = this._queue.indexOf(o);
        if (i === -1) {
            return false;
        } else {
            this.removeAt(i);
            return true;
        }
    }

    private removeAt(i: number): void {
        if (this._size <= i) return;

        const s = --this._size;
        if (s === i) {
            this._queue.pop();
        } else {
            const moved = this._queue.pop() as T;
            this.siftDown(i, moved);
            if (this.comparator(this._queue[i], moved) === 0) {
                this.siftUp(i, moved);
            }
        }
    }

    get size(): number {
        return this._size;
    }
}
