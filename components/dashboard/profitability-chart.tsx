'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '@/lib/dashboard/actions'

interface ProfitabilityChartProps {
  data: ChartDataPoint[]
}

function formatRupiahShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return value.toString()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg border bg-popover shadow-md px-3 py-2 text-sm space-y-1 min-w-40">
      <p className="font-semibold mb-2">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }} className="font-medium">
            {entry.name}
          </span>
          <span className="tabular-nums">
            {entry.name === 'Margin' || entry.name === 'Food Cost'
              ? `${entry.value}%`
              : `Rp${formatRupiahShort(entry.value)}`}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ProfitabilityChart({ data }: ProfitabilityChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        Belum ada data HPP untuk ditampilkan
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bar chart: HPP vs Selling Price vs Profit */}
      <div>
        <p className="text-sm font-medium mb-3 text-muted-foreground">
          HPP vs Harga Jual vs Profit (Rp)
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatRupiahShort}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="hpp" name="HPP" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} opacity={0.85} />
            <Bar dataKey="sellingPrice" name="Harga Jual" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
            <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart: Margin & Food Cost % */}
      <div>
        <p className="text-sm font-medium mb-3 text-muted-foreground">
          Margin & Food Cost (%)
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="margin" name="Margin" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
            <Bar dataKey="foodCost" name="Food Cost" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
