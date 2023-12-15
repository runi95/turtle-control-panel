export class Point {
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;
  
    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
  
    public toString(): string {
      return `(${this.x}, ${this.y}, ${this.z})`;
    }
  }
  