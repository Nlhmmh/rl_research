import type { Action } from '../game/types';

export interface Experience {
  state: number[];
  action: Action;
  reward: number;
  nextState: number[];
  done: boolean;
}

export class ReplayBuffer {
  private items: Experience[] = [];
  private nextIndex = 0;
  private readonly capacity: number;

  constructor(capacity = 20_000) {
    this.capacity = capacity;
  }

  add(item: Experience): void {
    const copy = { ...item, state: [...item.state], nextState: [...item.nextState] };
    if (this.items.length < this.capacity) this.items.push(copy);
    else this.items[this.nextIndex] = copy;
    this.nextIndex = (this.nextIndex + 1) % this.capacity;
  }

  get size(): number {
    return this.items.length;
  }

  sample(count: number): Experience[] {
    if (this.items.length < count) throw new Error('Not enough replay samples');
    return Array.from(
      { length: count },
      () => this.items[Math.floor(Math.random() * this.items.length)],
    );
  }
}
