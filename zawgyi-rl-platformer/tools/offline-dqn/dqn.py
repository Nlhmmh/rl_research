import numpy as np


class ReplayBuffer:
    def __init__(self, capacity, observation_size):
        self.states = np.empty((capacity, observation_size), dtype=np.float32)
        self.next_states = np.empty_like(self.states)
        self.actions = np.empty(capacity, dtype=np.intp)
        self.rewards = np.empty(capacity, dtype=np.float32)
        self.done = np.empty(capacity, dtype=np.bool_)
        self.size = 0
        self.index = 0

    def add(self, state, action, reward, next_state, done):
        index = self.index
        self.states[index] = state
        self.next_states[index] = next_state
        self.actions[index] = action
        self.rewards[index] = reward
        self.done[index] = done
        self.index = (index + 1) % len(self.states)
        self.size = min(self.size + 1, len(self.states))

    def sample(self, rng, size):
        indices = rng.integers(self.size, size=size)
        return (
            self.states[indices], self.actions[indices], self.rewards[indices],
            self.next_states[indices], self.done[indices],
        )


class DQN:
    def __init__(self, spec, seed):
        self.config = spec['dqn']
        self.rng = np.random.default_rng(seed)
        self.actions = spec['actions']
        self.epsilon = self.config['epsilon']
        self.updates = 0
        dimensions = [spec['observationSize'], *self.config['hiddenUnits'], len(self.actions)]
        self.weights = []
        for inputs, outputs in zip(dimensions[:-1], dimensions[1:]):
            bound = np.sqrt(6 / (inputs + outputs))
            self.weights.extend([
                self.rng.uniform(-bound, bound, (inputs, outputs)).astype(np.float32),
                np.zeros(outputs, dtype=np.float32),
            ])
        self.target = [weight.copy() for weight in self.weights]
        self.first_moments = [np.zeros_like(weight) for weight in self.weights]
        self.second_moments = [np.zeros_like(weight) for weight in self.weights]
        self.replay = ReplayBuffer(self.config['replayCapacity'], spec['observationSize'])

    @staticmethod
    def forward(state, weights):
        first = np.maximum(state @ weights[0] + weights[1], 0)
        second = np.maximum(first @ weights[2] + weights[3], 0)
        return first, second, second @ weights[4] + weights[5]

    def act(self, state, explore=True):
        if explore and self.rng.random() < self.epsilon:
            return self.actions[self.rng.integers(len(self.actions))]
        q_values = self.forward(np.asarray(state, dtype=np.float32), self.weights)[-1]
        return self.actions[int(q_values.argmax())]

    def train_batch(self):
        size = self.config['batchSize']
        if self.replay.size < size:
            return
        states, actions, rewards, next_states, done = self.replay.sample(self.rng, size)
        first, second, predictions = self.forward(states, self.weights)
        next_max = self.forward(next_states, self.target)[-1].max(axis=1)
        targets = rewards + self.config['gamma'] * np.where(done, 0, next_max)

        # Match the browser MSE. The unselected actions have zero gradient.
        rows = np.arange(size)
        output_grad = np.zeros_like(predictions)
        output_grad[rows, actions] = (predictions[rows, actions] - targets) * (2 / predictions.size)
        second_grad = (output_grad @ self.weights[4].T) * (second > 0)
        first_grad = (second_grad @ self.weights[2].T) * (first > 0)
        gradients = [
            states.T @ first_grad, first_grad.sum(axis=0),
            first.T @ second_grad, second_grad.sum(axis=0),
            second.T @ output_grad, output_grad.sum(axis=0),
        ]

        self.updates += 1
        beta_one, beta_two = 0.9, 0.999
        for weight, gradient, first_moment, second_moment in zip(
            self.weights, gradients, self.first_moments, self.second_moments
        ):
            first_moment *= beta_one
            first_moment += (1 - beta_one) * gradient
            second_moment *= beta_two
            second_moment += (1 - beta_two) * gradient ** 2
            corrected_first = first_moment / (1 - beta_one ** self.updates)
            corrected_second = second_moment / (1 - beta_two ** self.updates)
            weight -= self.config['learningRate'] * corrected_first / (np.sqrt(corrected_second) + 1e-7)

        if self.updates % self.config['targetUpdateEvery'] == 0:
            self.target = [weight.copy() for weight in self.weights]

    def finish_episode(self):
        self.epsilon = max(self.config['minEpsilon'], self.epsilon * self.config['epsilonDecay'])
