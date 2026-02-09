export class LinkedList<E> {
    private first: Node<E> | null = null;
    private last: Node<E> | null = null;
    private _size = 0;

    get size(): number {
        return this._size;
    }

    private linkFirst(e: E): void {
        const f = this.first;
        const newNode = new Node(null, e, f);
        this.first = newNode;
        if (f === null) this.last = newNode;
        else f.prev = newNode;
        this._size++;
    }

    public linkLast(e: E): void {
        const l = this.last;
        const newNode = new Node(l, e, null);
        this.last = newNode;
        if (l === null) this.first = newNode;
        else l.next = newNode;
        this._size++;
    }

    public linkBefore(e: E, succ: Node<E>): void {
        const pred = succ.prev;
        const newNode = new Node(pred, e, succ);
        succ.prev = newNode;
        if (pred === null) this.first = newNode;
        else pred.next = newNode;
        this._size++;
    }

    public linkAfter(e: E, succ: Node<E>): void {
        const next = succ.next;
        const newNode = new Node(succ, e, next);
        succ.next = newNode;
        if (next === null) this.last = newNode;
        else next.prev = newNode;
        this._size++;
    }

    private unlinkFirst(f: Node<E>): E | null {
        const element = f.item;
        const next = f.next;
        f.item = null;
        f.next = null;
        this.first = next;
        if (next === null) this.last = null;
        else next.prev = null;
        this._size--;
        return element;
    }

    private unlinkLast(l: Node<E>): E | null {
        const element = l.item;
        const prev = l.prev;
        l.item = null;
        l.prev = null;
        this.last = prev;
        if (prev === null) this.first = null;
        else prev.next = null;
        this._size--;
        return element;
    }

    public unlink(x: Node<E>): E | null {
        const element = x.item;
        const next = x.next;
        const prev = x.prev;

        if (prev === null) {
            this.first = next;
        } else {
            prev.next = next;
            x.prev = null;
        }

        if (next === null) {
            this.last = prev;
        } else {
            next.prev = prev;
            x.next = null;
        }

        x.item = null;
        this._size--;
        return element;
    }

    public getFirst(): E | null {
        const f = this.first;
        if (f === null) throw new Error('No such element');
        return f.item;
    }

    public getFirstNode(): Node<E> | null {
        return this.first;
    }

    public getLast(): E | null {
        const l = this.last;
        if (l === null) throw new Error('No such element');
        return l.item;
    }

    public removeFirst(): E | null {
        const f = this.first;
        if (f === null) throw new Error('No such element');
        return this.unlinkFirst(f);
    }

    public removeLast(): E | null {
        const l = this.last;
        if (l === null) throw new Error('No such element');
        return this.unlinkLast(l);
    }

    public addFirst(e: E): void {
        this.linkFirst(e);
    }

    public addLast(e: E): void {
        this.linkLast(e);
    }

    public add(e: E): boolean {
        this.linkLast(e);
        return true;
    }

    public addAll(c: E[]) {
        let pred = this.last;
        for (const o of c) {
            const newNode = new Node(pred, o, null);
            if (pred === null) this.first = newNode;
            else pred.next = newNode;
            pred = newNode;
        }

        this.last = pred;
        this._size += c.length;
        return true;
    }

    public clear(): void {
        for (let x = this.first; x !== null; ) {
            const next = x.next;
            x.item = null;
            x.next = null;
            x.prev = null;
            x = next;
        }

        this.first = this.last = null;
        this._size = 0;
    }

    public peek(): E | null {
        const f = this.first;
        return f === null ? null : f.item;
    }

    public element(): E | null {
        return this.getFirst();
    }

    public poll(): E | null {
        const f = this.first;
        return f === null ? null : this.unlinkFirst(f);
    }

    public remove(): E | null {
        return this.removeFirst();
    }
}

export class Node<E> {
    public item: E | null;
    public next: Node<E> | null;
    public prev: Node<E> | null;

    constructor(prev: Node<E> | null, element: E, next: Node<E> | null) {
        this.item = element;
        this.next = next;
        this.prev = prev;
    }
}
