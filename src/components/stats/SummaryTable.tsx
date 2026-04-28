import type { MetricStats } from '../../services/statsApi'
import type { MapMetric } from '../../types/metrics'
import { metricLabels } from '../../types/metrics'

const TABLE_METRICS = ['CCVI', 'CLI_risk', 'CON_risk', 'VUL'] as const

const METRIC_DISPLAY: Record<string, string> = {
  CCVI:    'CCVI',
  CLI_risk: 'Climate Risk',
  CON_risk: 'Conflict Risk',
  VUL:     'Vulnerability',
}

type Props = {
  stats: MetricStats[]
  activeMetric: MapMetric
}

const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '—')

export function SummaryTable({ stats, activeMetric }: Props) {
  const tableRows = TABLE_METRICS.map((m) => stats.find((s) => s.metric === m)).filter(Boolean) as MetricStats[]

  return (
    <div className="summary-table-wrapper">
      <table className="summary-table">
        <thead>
          <tr>
            <th className="summary-table__metric-col">Metric</th>
            <th>n</th>
            <th>Min</th>
            <th>P25</th>
            <th>Median</th>
            <th>Mean</th>
            <th>P75</th>
            <th>Max</th>
            <th>Std Dev</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((s) => (
            <tr key={s.metric} className={s.metric === 'CCVI' && activeMetric === 'CCVI' ? 'summary-table__row--active' : ''}>
              <td className="summary-table__metric-name">
                {METRIC_DISPLAY[s.metric] ?? s.metric}
              </td>
              <td className="summary-table__n">{s.n.toLocaleString()}</td>
              <td>{fmt(s.min)}</td>
              <td>{fmt(s.p25)}</td>
              <td className="summary-table__highlight">{fmt(s.median)}</td>
              <td className="summary-table__highlight">{fmt(s.mean)}</td>
              <td>{fmt(s.p75)}</td>
              <td>{fmt(s.max)}</td>
              <td className="summary-table__std">{fmt(s.std)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
