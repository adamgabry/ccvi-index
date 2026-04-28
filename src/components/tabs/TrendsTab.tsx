import { useState, useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { useFilters } from '../../state/useFilters'
import { useRadarData } from '../../hooks/useRadarData'
import { radarConfig, metricLabels } from '../../types/metrics'
import type { MapMetric } from '../../types/metrics'

const CONTINENT_COLORS: Record<string, string> = {
  Africa:   '#f97316',
  Americas: '#3b82f6',
  Asia:     '#10b981',
  Europe:   '#8b5cf6',
  Oceania:  '#ec4899',
}
const COUNTRY_PALETTE = [
  '#00e5c3','#ff4f6d','#f5a623','#7c6fff','#00c4e8',
  '#ff9f43','#54a0ff','#5f27cd','#00d2d3','#ff6b6b',
  '#1dd1a1','#feca57','#48dbfb','#ff9ff3','#c8d6e5',
]
const FALLBACK = '#8892a4'

function getColor(iso3: string, continent: string, idx: number): string {
  return COUNTRY_PALETTE[idx % COUNTRY_PALETTE.length] ?? FALLBACK
}

type RadarRow = { iso3: string; continent: string; [col: string]: number | string | null }

function RadarChart({ data, columns }: { data: RadarRow[]; columns: string[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current || data.length === 0 || columns.length < 3) return

    const W = wrapperRef.current.clientWidth || 520
    const H = Math.min(W, 480)
    const cx = W / 2
    const cy = H / 2
    const radius = Math.min(cx, cy) - 60

    const domains: Record<string, [number, number]> = {}
    for (const col of columns) {
      const vals = data.map((d) => Number(d[col])).filter((v) => isFinite(v))
      const mn = d3.min(vals) ?? 0
      const mx = d3.max(vals) ?? 1
      domains[col] = [mn, mx === mn ? mx + 1 : mx]
    }

    const angleSlice = (2 * Math.PI) / columns.length

    function radialPoint(colIdx: number, value: number): [number, number] {
      const [mn, mx] = domains[columns[colIdx]]
      const r = radius * ((value - mn) / (mx - mn))
      const angle = angleSlice * colIdx - Math.PI / 2
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
    }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', H)

    const levels = 5
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = radius * (lvl / levels)
      const pts = columns.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
      }).join(' ')
      svg.append('polygon')
        .attr('points', pts)
        .attr('fill', 'none')
        .attr('stroke', '#1e2436')
        .attr('stroke-width', 1)
      // Ring label
      svg.append('text')
        .attr('x', cx)
        .attr('y', cy - r - 3)
        .attr('text-anchor', 'middle')
        .attr('fill', '#3a4155')
        .attr('font-size', '9px')
        .text(d3.format('.2f')(lvl / levels))
    }

    columns.forEach((col, i) => {
      const angle = angleSlice * i - Math.PI / 2
      const lx = cx + (radius + 18) * Math.cos(angle)
      const ly = cy + (radius + 18) * Math.sin(angle)

      svg.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + radius * Math.cos(angle))
        .attr('y2', cy + radius * Math.sin(angle))
        .attr('stroke', '#2a3045').attr('stroke-width', 1)

      const label = metricLabels[col] ?? col
      const words = label.split(' ')
      const textEl = svg.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('text-anchor', Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end')
        .attr('fill', '#8892a4').attr('font-size', '10px')

      if (words.length <= 3) {
        textEl.text(label)
      } else {
        const mid = Math.ceil(words.length / 2)
        textEl.append('tspan').attr('x', lx).attr('dy', '-0.4em').text(words.slice(0, mid).join(' '))
        textEl.append('tspan').attr('x', lx).attr('dy', '1.2em').text(words.slice(mid).join(' '))
      }
    })

    const tooltip = d3.select('body').select<HTMLDivElement>('.radar-tooltip')

    data.forEach((row, idx) => {
      const color = getColor(row.iso3, row.continent, idx)
      const pts = columns.map((col, i) => {
        const v = Number(row[col])
        return isFinite(v) ? radialPoint(i, v) : [cx, cy] as [number, number]
      })

      const pathData = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + 'Z'

      svg.append('path')
        .attr('d', pathData)
        .attr('fill', color).attr('fill-opacity', 0.07)
        .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-opacity', 0.85)

      pts.forEach(([px, py], i) => {
        const v = Number(row[columns[i]])
        if (!isFinite(v)) return
        svg.append('circle')
          .attr('cx', px).attr('cy', py).attr('r', 3)
          .attr('fill', color).attr('stroke', '#0a0c10').attr('stroke-width', 0.5)
          .on('mouseover', (event) => {
            d3.select('.radar-tooltip')
              .style('opacity', '1')
              .style('left', `${(event as MouseEvent).pageX + 10}px`)
              .style('top', `${(event as MouseEvent).pageY - 20}px`)
              .html(`<strong>${row.iso3}</strong><br/>${metricLabels[columns[i]] ?? columns[i]}: ${v.toFixed(3)}`)
          })
          .on('mouseout', () => d3.select('.radar-tooltip').style('opacity', '0'))
      })
    })

  }, [data, columns])

  return (
    <div ref={wrapperRef} style={{ width: '100%', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block', margin: '0 auto' }} />
    </div>
  )
}

function RadarLegend({ data }: { data: RadarRow[] }) {
  if (data.length === 0) return null
  return (
    <div className="radar-legend">
      {data.map((row, idx) => (
        <div key={row.iso3} className="radar-legend__item">
          <span
            className="radar-legend__swatch"
            style={{ background: getColor(row.iso3, row.continent, idx) }}
          />
          <span className="radar-legend__label">{row.iso3}</span>
        </div>
      ))}
    </div>
  )
}

function SubIndexSelector({
  metric,
  value,
  onChange,
}: {
  metric: MapMetric
  value: string
  onChange: (v: string) => void
}) {
  const cfg = radarConfig[metric]
  if (!('subIndices' in cfg)) return null // CCVI has no sub-indices

  const entries = Object.entries(cfg.subIndices)

  return (
    <div className="radar-subindex-selector">
      <label className="filter-label">Sub-index</label>
      <div className="filter-toggle-group">
        {entries.map(([key, sub]) => (
          <button
            key={key}
            className={`filter-toggle-btn${value === key ? ' active' : ''}`}
            onClick={() => onChange(key)}
          >
            {sub.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TrendsTab() {
  const { filters } = useFilters()
  const metric = filters.metric

  const cfg = radarConfig[metric]
  const hasSubIndices = 'subIndices' in cfg

  const defaultSubIndex = hasSubIndices ? Object.keys((cfg as { subIndices: Record<string, unknown> }).subIndices)[0] : ''
  const [subIndex, setSubIndex] = useState(defaultSubIndex)

  useEffect(() => {
    const newDefault = hasSubIndices
      ? Object.keys((radarConfig[metric] as { subIndices: Record<string, unknown> }).subIndices)[0]
      : ''
    setSubIndex(newDefault)
  }, [metric])

  const columns = useMemo(() => {
    if (!hasSubIndices) {
      return (cfg as { columns: string[] }).columns
    }
    const sub = (cfg as { subIndices: Record<string, { columns: string[] }> }).subIndices[subIndex]
    return sub?.columns ?? []
  }, [metric, subIndex])

  const { data, loading, error } = useRadarData(
    columns,
    filters.country,
    filters.continent,
    filters.geoMode,
    filters.period,
    filters.year,
    filters.periodMode,
  )

  const periodLabel = filters.periodMode === 'quarter'
    ? filters.period.replace('-Q', ' Q')
    : `${filters.year} (avg)`

  const geoLabel = filters.geoMode === 'country'
    ? (filters.country !== 'all' ? filters.country : 'All countries')
    : (filters.continent !== 'all' ? filters.continent : 'All continents')

  return (
    <div className="trends-tab">
      {/* Tooltip portal */}
      <div
        className="radar-tooltip"
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          opacity: 0,
          background: 'rgba(10,12,16,0.95)',
          border: '1px solid #222733',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#e8eaf0',
          zIndex: 9999,
          transition: 'opacity 0.1s',
        }}
      />

      <section className="stats-section">
        <header className="stats-section__header">
          <h3 className="stats-section__title">Radar Plot</h3>
          <span className="stats-section__subtitle">
            {periodLabel} · {geoLabel} · one polygon per country
          </span>
        </header>

        <SubIndexSelector metric={metric} value={subIndex} onChange={setSubIndex} />

        {loading && (
          <div className="stats-loading">
            <span className="stats-loading__spinner" />
            <p>Loading radar data…</p>
          </div>
        )}
        {error && <div className="stats-empty"><p>⚠️ {error}</p></div>}
        {!loading && !error && data && data.length === 0 && (
          <div className="stats-empty"><p>No data for this selection.</p></div>
        )}
        {!loading && !error && data && data.length > 0 && columns.length >= 3 && (
          <>
            <RadarChart data={data} columns={columns} />
            <RadarLegend data={data} />
          </>
        )}
        {!loading && !error && columns.length < 3 && (
          <div className="stats-empty"><p>Need at least 3 axes for radar chart.</p></div>
        )}
      </section>
    </div>
  )
}
