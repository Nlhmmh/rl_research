import argparse
from contextlib import closing
import json
from pathlib import Path
import subprocess
from time import perf_counter
from uuid import uuid4

from dqn import DQN
from policy_store import DEFAULT_DATABASE, open_database, save_policy


class Simulator:
    def __init__(self, process):
        self.process = process
        self.spec = self.read()

    def read(self):
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError('TypeScript simulator exited. Check the Node error.')
        return json.loads(line)

    def send(self, index, action):
        self.process.stdin.write(f'[{index},{action if action is not None else "null"}]\n')
        self.process.stdin.flush()
        return self.read()


def evaluate(simulator, agent, episode):
    state = simulator.send(1, None)
    reward = 0
    steps = 0
    done = False
    while not done:
        state, earned, done, success = simulator.send(1, agent.act(state, explore=False))
        reward += earned
        steps += 1
    return {'episode': episode, 'success': success, 'steps': steps, 'reward': reward}


def train(simulator, step_budget, seed, database):
    spec = simulator.spec
    agent = DQN(spec, seed)
    interval = spec['evaluation']['everyEpisodes']
    patience = spec['evaluation']['patience']
    run_id = f'offline-{uuid4()}'
    best_id = None
    started = perf_counter()
    first_success = None
    best = None
    stale = 0
    episode = 0
    state = simulator.send(0, None)
    print(json.dumps({'runId': run_id, 'seed': seed, 'stepBudget': step_budget}), flush=True)

    for index in range(step_budget):
        action = agent.act(state)
        next_state, reward, done, _ = simulator.send(0, action)
        agent.replay.add(state, action, reward, next_state, done)
        if index % spec['dqn']['updateEvery'] == 0:
            agent.train_batch()
        state = next_state
        if done:
            episode += 1
            agent.finish_episode()
        total_steps = index + 1
        at_budget = total_steps == step_budget
        if at_budget or (done and episode % interval == 0):
            result = evaluate(simulator, agent, episode)
            if result['success'] and (best is None or result['steps'] < best['steps']):
                best = result
                if first_success is None:
                    first_success = {
                        'trainingSteps': total_steps, 'seconds': round(perf_counter() - started, 2),
                    }
                best_id = save_policy(
                    database, run_id, 'best', best, total_steps, spec, agent.weights, agent.epsilon,
                    seed=seed,
                )
                stale = 0
            elif best is not None:
                stale += 1
            print(json.dumps({'trainingSteps': total_steps, 'evaluation': result}), flush=True)
            if at_budget or stale >= patience:
                break
        if done:
            state = simulator.send(0, None)

    final_id = save_policy(
        database, run_id, 'final', result, total_steps, spec, agent.weights, agent.epsilon,
        seed=seed, stop_reason='step-budget' if at_budget else 'no-improvement',
    )
    duration = perf_counter() - started
    print(json.dumps({
        'seed': seed, 'trainingSteps': total_steps, 'updates': agent.updates,
        'seconds': round(duration, 2), 'stepsPerSecond': round(total_steps / duration),
        'firstSuccess': first_success, 'best': best, 'final': result,
        'checkpointIds': {'best': best_id, 'final': final_id},
    }), flush=True)


def main():
    parser = argparse.ArgumentParser(description='Train a Zawgyi DQN offline and save policies to SQLite for Watch AI.')
    parser.add_argument('--steps', type=int, default=1_000_000, help='Simulator step budget')
    parser.add_argument('--seed', type=int, default=11, help='Random seed')
    parser.add_argument('--database', type=Path, default=DEFAULT_DATABASE, help='SQLite policy database')
    args = parser.parse_args()
    if args.steps < 1 or args.seed < 0:
        parser.error('--steps must be positive and --seed must be nonnegative')
    bridge = Path(__file__).resolve().with_name('simulator.mjs')
    with subprocess.Popen(
        ['node', str(bridge)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True,
    ) as process:
        try:
            with closing(open_database(args.database)) as database:
                train(Simulator(process), args.steps, args.seed, database)
        finally:
            process.stdin.close()


if __name__ == '__main__':
    main()
