import type { AgentStats } from '../rl/protocol';

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
            <th>Reward</th>
            <th>Avg (100)</th>
            <th>Win % (100)</th>
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
              <td>
                {item.episode}/{item.targetEpisodes}
              </td>
              <td>{item.episodeReward.toFixed(1)}</td>
              <td>{item.averageReward100.toFixed(1)}</td>
              <td>{item.successRate100.toFixed(1)}%</td>
              <td>{item.epsilon.toFixed(3)}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
