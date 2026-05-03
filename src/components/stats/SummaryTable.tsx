import { Fragment } from 'react'
import type { MetricStats } from '../../services/statsApi'
import type { MapMetric } from '../../types/metrics'
import { metricLabels, radarConfig } from '../../types/metrics'

type Props = {
  stats: MetricStats[]
  activeMetric: MapMetric
}

const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '—')

function getTableColumns(metric: MapMetric): string[] {
  const cfg = radarConfig[metric]
  if (!('subIndices' in cfg)) {
    // CCVI: show its three pillars
    return (cfg as { columns: string[] }).columns
  }
  return Object.values(cfg.subIndices).flatMap((sub) => sub.columns)
}

function getGroupedColumns(metric: MapMetric): { group: string; columns: string[] }[] {
  const cfg = radarConfig[metric]
  if (!('subIndices' in cfg)) {
    return [{ group: '', columns: (cfg as { columns: string[] }).columns }]
  }
  return Object.values(cfg.subIndices).map((sub) => ({
    group: sub.label,
    columns: sub.columns,
  }))
}

export function SummaryTable({ stats, activeMetric }: Props) {
  const groups  = getGroupedColumns(activeMetric)
  const statMap = Object.fromEntries(stats.map((s) => [s.metric, s]))

  return (
    <div className="summary-table-wrapper">
      <table className="summary-table">
        <thead>
          <tr>
            <th className="summary-table__metric-col">Indicator</th>
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
          {groups.map(({ group, columns }) => (
            <Fragment key={group || 'default'}>
              {group && (
                <tr className="summary-table__group-row">
                  <td colSpan={9}>{group}</td>
                </tr>
              )}
              {columns.map((col) => {
                const s = statMap[col]
                return (
                  <tr key={col}>
                    <td className="summary-table__metric-name">
                      {metricLabels[col] ?? col}
                    </td>
                    {s ? (
                      <>
                        <td className="summary-table__n">{s.n.toLocaleString()}</td>
                        <td>{fmt(s.min)}</td>
                        <td>{fmt(s.p25)}</td>
                        <td className="summary-table__highlight">{fmt(s.median)}</td>
                        <td className="summary-table__highlight">{fmt(s.mean)}</td>
                        <td>{fmt(s.p75)}</td>
                        <td>{fmt(s.max)}</td>
                        <td className="summary-table__std">{fmt(s.std)}</td>
                      </>
                    ) : (
                      <td colSpan={8} style={{ color: '#94a3b8', fontSize: '11px' }}>No data</td>
                    )}
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
