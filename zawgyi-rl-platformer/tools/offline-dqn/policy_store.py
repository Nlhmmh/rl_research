from base64 import b64encode
from datetime import datetime, timezone
import json
from math import prod
from pathlib import Path
import sqlite3

import numpy as np


DEFAULT_DATABASE = Path(__file__).resolve().parents[2] / '.data' / 'policies.sqlite'
OFFLINE_SCOPE = 'offline-local'


def open_database(path):
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    try:
        connection.execute('PRAGMA journal_mode = WAL')
        connection.execute('''
            CREATE TABLE IF NOT EXISTS policy_records (
                browser_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL CHECK (json_valid(value)),
                PRIMARY KEY (browser_id, key)
            )
        ''')
        return connection
    except BaseException:
        connection.close()
        raise


def save_policy(connection, run_id, kind, evaluation, steps, spec, weights, epsilon, *,
                seed=None, stop_reason=None):
    model = spec['model']
    weight_specs = model['weightSpecs']
    if len(weights) != len(weight_specs):
        raise ValueError('DQN weight layout does not match the game model')

    buffers = []
    for weight, weight_spec in zip(weights, weight_specs):
        if weight.size != prod(weight_spec['shape']) or weight_spec['dtype'] != 'float32':
            raise ValueError('DQN weight shape or dtype does not match the game model')
        serialized = weight.astype('<f4', copy=False)
        if not np.isfinite(serialized).all():
            raise ValueError('DQN weights contain non-finite values')
        buffers.append(serialized.tobytes())

    policy_id = f'{run_id}/AI-1/{kind}'
    details = {'kind': kind, 'evaluation': evaluation, 'totalSteps': steps}
    if seed is not None:
        details['seed'] = seed
    if stop_reason is not None:
        details['stopReason'] = stop_reason
    record = {
        'metadata': {
            'schemaVersion': 1,
            'id': policy_id,
            'algorithm': 'dqn',
            'savedAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
            'levelId': spec['levelId'],
            'observationVersion': spec['observationVersion'],
            'rewardVersion': spec['rewardVersion'],
            'episode': evaluation['episode'],
            'epsilon': epsilon,
            'details': details,
        },
        'model': {
            **model,
            'weightData': {'$arrayBuffer': b64encode(b''.join(buffers)).decode('ascii')},
        },
    }
    payload = json.dumps(record, allow_nan=False, separators=(',', ':'))
    with connection:
        connection.execute('''
            INSERT INTO policy_records (browser_id, key, value) VALUES (?, ?, ?)
            ON CONFLICT (browser_id, key) DO UPDATE SET value = excluded.value
        ''', (OFFLINE_SCOPE, f'zawgyi/checkpoint/{policy_id}', payload))
    return policy_id
