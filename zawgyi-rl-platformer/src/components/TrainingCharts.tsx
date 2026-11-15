import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryPoint } from '../rl/protocol';

const COLORS = [
  '#b81f32',
  '#2563eb',
  '#16a34a',
  '#b45309',
  '#9333ea',
  '#0891b2',
  '#be185d',
  '#65a30d',
];
type Metric = 'reward' | 'averageReward100' | 'successRate100';

export function TrainingChart({
  history,
  agentIds,
  metric,
  title,
}: {
  history: HistoryPoint[];
  agentIds: string[];
  metric: Metric;
  title: string;
}) {
  const rows = new Map<number, Record<string, number>>();
  history.forEach((point) => {
    if (point.episode % 10 !== 0 && point !== history.at(-1)) return;
    const row = rows.get(point.episode) ?? { episode: point.episode };
    row[point.agentId] = point[metric];
    rows.set(point.episode, row);
  });
  return (
    <section className="panel chart-panel" aria-label={title}>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={[...rows.values()]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="episode" />
          <YAxis />
          <Tooltip />
          <Legend />
          {agentIds.map((id, index) => (
            <Line
              key={id}
              dataKey={id}
              name={id}
              stroke={COLORS[index % COLORS.length]}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
