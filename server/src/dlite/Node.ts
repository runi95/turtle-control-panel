import {Point} from './Point';

export class Node {
    public readonly point: Point;
    public readonly isWall: boolean;

  public key: [number, number];
  public g: number;
  public rhs: number;

  public visited = false;
  public closed = false;
  public parent: Node | null = null;

  constructor(point: Point, isWall: boolean) {
    this.point = point;
    this.isWall = isWall;

    this.key = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
    this.g = Number.POSITIVE_INFINITY;
    this.rhs = Number.POSITIVE_INFINITY;

  }

  public valueOf(): number {
    return this.g;
  }
}
