'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatINR, fromPaise } from '@brick/utils';
import type { TrendPoint } from '@/lib/entities';

const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const rows = data.map((p) => ({
    month: monthLabel(p.month),
    Revenue: fromPaise(p.revenuePaise),
    Purchase: fromPaise(p.purchasePaise),
    'Net profit': fromPaise(p.netProfitPaise),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${v / 1000}k`)}
          width={48}
        />
        <Tooltip
          formatter={(v: number) => formatINR(Math.round(v * 100))}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Revenue" fill="hsl(24 95% 53%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Purchase" fill="hsl(215 16% 47%)" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="Net profit" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
