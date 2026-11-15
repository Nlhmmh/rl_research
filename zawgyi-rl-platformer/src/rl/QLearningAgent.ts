import { ACTIONS, type Action } from '../game/types';
import { Q_LEARNING } from '../game/level';

export class QLearningAgent {
  readonly table = new Map<string, number[]>();
  alpha: number = Q_LEARNING.alpha;
  gamma: number = Q_LEARNING.gamma;
  epsilon: number = Q_LEARNING.epsilon;
  minEpsilon: number = Q_LEARNING.minEpsilon;
  epsilonDecay: number = Q_LEARNING.epsilonDecay;

  private row(stateKey: string): number[] {
    let values = this.table.get(stateKey);
    if (!values) {
      values = ACTIONS.map(() => 0);
      this.table.set(stateKey, values);
    }
    return values;
  }

  act(stateKey: string, explore = true): Action {
    if (explore && Math.random() < this.epsilon) {
      return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    }
    const values = this.row(stateKey);
    const highest = Math.max(...values);
    const ties = ACTIONS.filter((action) => values[action] === highest);
    return ties[Math.floor(Math.random() * ties.length)];
  }

  learn(s: string, action: Action, reward: number, nextState: string, done: boolean): void {
    const current = this.row(s);
    const bestNext = done ? 0 : Math.max(...this.row(nextState));
    const target = reward + this.gamma * bestNext;
    current[action] += this.alpha * (target - current[action]);
  }

  finishEpisode(): void {
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
  }

  serialize() {
    return {
      table: [...this.table.entries()],
      epsilon: this.epsilon,
      alpha: this.alpha,
      gamma: this.gamma,
    };
  }

  load(data: ReturnType<QLearningAgent['serialize']>): void {
    this.table.clear();
    for (const [key, values] of data.table) this.table.set(key, [...values]);
    this.epsilon = data.epsilon;
    this.alpha = data.alpha;
    this.gamma = data.gamma;
  }
}
