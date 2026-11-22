import type { EvaluationResult } from '../../modules/reinforcement-learning/application/evaluation';
import type { AgentStats } from '../../modules/reinforcement-learning/infrastructure/workers/protocol';

function evaluationLabel(result?: EvaluationResult) {
  if (!result) return '—';
  return result.success
    ? `Goal in ${result.steps} steps (ep. ${result.episode})`
    : `Missed goal (ep. ${result.episode})`;
}

export function AgentStatsTable({
  stats,
  selectedId,
  onSelect,
}: {
  stats: AgentStats[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Algorithm</th>
            <th>Episode</th>
            <th>Training steps</th>
            <th>Latest greedy</th>
            <th>Best greedy</th>
            <th>Latest furthest x</th>
            <th>ε</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((item) => (
            <tr
              key={item.id}
              className={selectedId === item.id ? 'selected' : ''}
              onClick={() => onSelect(item.id)}
              tabIndex={0}
              onKeyDown={(event) => event.key === 'Enter' && onSelect(item.id)}
            >
              <td>{item.id}</td>
              <td>{item.algorithm}</td>
              <td>{item.episode}</td>
              <td>
                {item.totalSteps.toLocaleString()} / {item.stepBudget.toLocaleString()}
              </td>
              <td>{evaluationLabel(item.latestEvaluation)}</td>
              <td>{evaluationLabel(item.bestEvaluation)}</td>
              <td>
                {item.latestEvaluation?.furthestX === undefined
                  ? '—'
                  : `${Math.round(item.latestEvaluation.furthestX)} px`}
              </td>
              <td>{item.epsilon.toFixed(3)}</td>
              <td>
                {item.stopReason
                  ? item.bestEvaluation
                    ? 'Solved'
                    : 'Budget reached'
                  : item.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
