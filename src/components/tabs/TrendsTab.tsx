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
  '#ff9f43','#54a0ff','#c0392b','#00d2d3','#6ab04c',
  '#1dd1a1','#feca57','#48dbfb','#e056fd','#badc58',
  '#f9ca24','#6c5ce7','#fd9644','#26de81','#a29bfe',
]

function getColor(_continent: string, idx: number): string {
  return COUNTRY_PALETTE[idx % COUNTRY_PALETTE.length]
}

type RadarRow = { iso3: string; continent: string; [col: string]: number | string | null }

function RadarChart({ data, columns }: { data: RadarRow[]; columns: string[] }) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg  = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap || data.length === 0 || columns.length < 3) return

    const W       = wrap.clientWidth || 540
    const H       = Math.min(W * 0.88, 500)
    const cx      = W / 2
    const cy      = H / 2
    const lblPad  = columns.length > 4 ? 72 : 60
    const radius  = Math.min(cx, cy) - lblPad
    const N       = columns.length
    const aSlice  = (2 * Math.PI) / N

    const domains: Record<string, [number, number]> = {}
    for (const col of columns) {
      const vals = data.map((d) => Number(d[col])).filter(isFinite)
      let mn = d3.min(vals) ?? 0
      let mx = d3.max(vals) ?? 1
      if (mn === mx) {
        const spread = mx === 0 ? 0.5 : Math.abs(mx) * 0.25
        mn -= spread
        mx += spread
      }
      domains[col] = [mn, mx]
    }

    function radialPt(ci: number, value: number): [number, number] {
      const [mn, mx] = domains[columns[ci]]
      const t  = Math.max(0, Math.min(1, (value - mn) / (mx - mn)))
      const r  = radius * t
      const a  = aSlice * ci - Math.PI / 2
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    }

    const n          = data.length
    const fillAlpha  = n <= 8  ? 0.10 : Math.max(0.02, 0.10 - (n - 8) / 52 * 0.08)
    const strokeAlpha = n <= 8 ? 0.85 : Math.max(0.18, 0.85 - (n - 8) / 52 * 0.67)

    const sel = d3.select(svg)
    sel.selectAll('*').remove()
    sel.attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)

    const levels = 5
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r   = radius * (lvl / levels)
      const pts = columns.map((_, i) => {
        const a = aSlice * i - Math.PI / 2
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
      }).join(' ')
      sel.append('polygon')
        .attr('points', pts)
        .attr('fill', lvl % 2 === 0 ? '#f8fafc' : 'none')
        .attr('stroke', '#cbd5e1').attr('stroke-width', 0.5)
    }

    columns.forEach((col, i) => {
      const a  = aSlice * i - Math.PI / 2
      const ex = cx + radius * Math.cos(a)
      const ey = cy + radius * Math.sin(a)

      sel.append('line')
        .attr('x1', cx).attr('y1', cy).attr('x2', ex).attr('y2', ey)
        .attr('stroke', '#e2e8f0').attr('stroke-width', 1)

      const [mn, mx] = domains[col]
      sel.append('text')
        .attr('x', cx + (radius + 8) * Math.cos(a))
        .attr('y', cy + (radius + 8) * Math.sin(a))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#b0bac8').attr('font-size', '8px')
        .text(d3.format('.2f')(mx))

      const lx     = cx + (radius + lblPad * 0.55) * Math.cos(a)
      const ly     = cy + (radius + lblPad * 0.55) * Math.sin(a)
      const label  = metricLabels[col] ?? col
      const words  = label.split(' ')
      const anchor = Math.abs(Math.cos(a)) < 0.15 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'

      const txt = sel.append('text')
        .attr('x', lx).attr('y', ly)
        .attr('text-anchor', anchor)
        .attr('fill', '#475569').attr('font-size', '10px').attr('font-weight', '500')

      if (words.length <= 2) {
        txt.text(label)
      } else {
        const mid = Math.ceil(words.length / 2)
        txt.append('tspan').attr('x', lx).attr('dy', '-0.55em').text(words.slice(0, mid).join(' '))
        txt.append('tspan').attr('x', lx).attr('dy', '1.2em').text(words.slice(mid).join(' '))
      }
    })

    const polyGroup = sel.append('g').attr('class', 'poly-group')

    data.forEach((row, idx) => {
      const color = getColor(row.continent, idx)
      const pts   = columns.map((col, i) => {
        const v = Number(row[col])
        return isFinite(v) ? radialPt(i, v) : ([cx, cy] as [number, number])
      })
      const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'

      polyGroup.append('path')
        .attr('class', `poly-fill iso-${row.iso3}`)
        .attr('d', path)
        .attr('fill', color)
        .attr('fill-opacity', fillAlpha)
        .attr('stroke', 'none')
        .attr('pointer-events', 'none')

      polyGroup.append('path')
        .attr('class', `poly-stroke iso-${row.iso3}`)
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', strokeAlpha)
        .attr('pointer-events', 'none')

      polyGroup.append('path')
        .attr('class', `poly-hit iso-${row.iso3}`)
        .attr('d', path)
        .attr('fill', 'transparent')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 8)
        .attr('cursor', 'pointer')
        .on('mouseenter', function (event: MouseEvent) {
          sel.selectAll('.poly-fill').attr('fill-opacity', fillAlpha * 0.3)
          sel.selectAll('.poly-stroke').attr('stroke-opacity', strokeAlpha * 0.25)
          sel.selectAll(`.poly-fill.iso-${row.iso3}`).attr('fill-opacity', 0.22)
          sel.selectAll(`.poly-stroke.iso-${row.iso3}`).attr('stroke-opacity', 1).attr('stroke-width', 2.5)

          const tip = tipRef.current
          if (!tip) return
          tip.style.opacity = '1'
          tip.style.left    = `${event.pageX + 14}px`
          tip.style.top     = `${event.pageY - 28}px`
          tip.innerHTML = `
            <div style="font-weight:700;margin-bottom:4px">${row.iso3} · ${row.continent}</div>
            ${columns.map((col) => {
              const v = Number(row[col])
              return `<div><span style="color:#64748b">${metricLabels[col] ?? col}:</span> ${isFinite(v) ? v.toFixed(3) : '—'}</div>`
            }).join('')}
          `
        })
        .on('mousemove', function (event: MouseEvent) {
          const tip = tipRef.current
          if (tip) {
            tip.style.left = `${event.pageX + 14}px`
            tip.style.top  = `${event.pageY - 28}px`
          }
        })
        .on('mouseleave', function () {
          sel.selectAll('.poly-fill').attr('fill-opacity', fillAlpha)
          sel.selectAll('.poly-stroke').attr('stroke-opacity', strokeAlpha).attr('stroke-width', 1.5)
          const tip = tipRef.current
          if (tip) tip.style.opacity = '0'
        })
    })

    sel.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 2).attr('fill', '#cbd5e1')

  }, [data, columns]) 

  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: 'auto' }} />
      <div
        ref={tipRef}
        style={{
          position: 'fixed', pointerEvents: 'none', opacity: 0,
          background: 'rgba(15,23,42,0.97)', border: '1px solid #334155',
          borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
          lineHeight: '1.6', color: '#e2e8f0', zIndex: 9999,
          maxWidth: '260px', transition: 'opacity 0.1s',
        }}
      />
    </div>
  )
}

function RadarLegend({ data }: { data: RadarRow[] }) {
  if (data.length === 0) return null
  const MAX_SHOWN = 40
  const shown     = data.slice(0, MAX_SHOWN)
  const overflow  = data.length - MAX_SHOWN
  return (
    <div className="radar-legend">
      {shown.map((row, idx) => (
        <div key={row.iso3} className="radar-legend__item">
          <span className="radar-legend__swatch" style={{ background: getColor(row.continent, idx) }} />
          <span className="radar-legend__label">{row.iso3}</span>
        </div>
      ))}
      {overflow > 0 && (
        <div className="radar-legend__item radar-legend__item--overflow">+{overflow} more</div>
      )}
    </div>
  )
}

function SubIndexSelector({ metric, value, onChange }: { metric: MapMetric; value: string; onChange: (v: string) => void }) {
  const cfg = radarConfig[metric]
  if (!('subIndices' in cfg)) return null
  const entries = Object.entries(cfg.subIndices)
  return (
    <div className="radar-subindex-selector">
      <label className="filter-label">Sub-index</label>
      <div className="filter-toggle-group">
        {entries.map(([key, sub]) => (
          <button key={key} className={`filter-toggle-btn${value === key ? ' active' : ''}`} onClick={() => onChange(key)}>
            {sub.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TrendsTab() {
  const { filters } = useFilters()
  const metric      = filters.metric
  const cfg         = radarConfig[metric]
  const hasSubIdx   = 'subIndices' in cfg

  const defaultSub  = hasSubIdx ? Object.keys((cfg as { subIndices: Record<string, unknown> }).subIndices)[0] : ''
  const [subIndex, setSubIndex] = useState(defaultSub)

  useEffect(() => {
    const newDefault = hasSubIdx
      ? Object.keys((radarConfig[metric] as { subIndices: Record<string, unknown> }).subIndices)[0]
      : ''
    setSubIndex(newDefault)
  }, [metric])

  const columns = useMemo(() => {
    if (!hasSubIdx) return (cfg as { columns: string[] }).columns
    const sub = (cfg as { subIndices: Record<string, { columns: string[] }> }).subIndices[subIndex]
    return sub?.columns ?? []
  }, [metric, subIndex])

  const { data, loading, error } = useRadarData(
    columns,
    filters.country, filters.continent, filters.geoMode,
    filters.period, filters.year, filters.periodMode,
  )

  const periodLabel = filters.periodMode === 'quarter'
    ? filters.period.replace('-Q', ' Q')
    : `${filters.year} (avg)`
  const geoLabel = filters.geoMode === 'country'
    ? (filters.country !== 'all' ? filters.country : 'All countries')
    : (filters.continent !== 'all' ? filters.continent : 'All continents')

  return (
    <div className="trends-tab">
      <section className="stats-section">
        <header className="stats-section__header">
          <h3 className="stats-section__title">Radar Plot</h3>
          <span className="stats-section__subtitle">{periodLabel} · {geoLabel} · one polygon per country</span>
        </header>
        <div style={{ padding: '0 1rem 1rem' }}>
          <SubIndexSelector metric={metric} value={subIndex} onChange={setSubIndex} />
          {(data?.length ?? 0) > 8 && !loading && (
            <p className="radar-saturation-notice">{data!.length} countries · hover to highlight</p>
          )}
          {loading && <div className="stats-loading"><span className="stats-loading__spinner" /><p>Loading…</p></div>}
          {error && <div className="stats-empty"><p>⚠️ {error}</p></div>}
          {!loading && !error && data?.length === 0 && <div className="stats-empty"><p>No data for this selection.</p></div>}
          {!loading && !error && (data?.length ?? 0) > 0 && columns.length >= 3 && (
            <>
              <RadarChart data={data!} columns={columns} />
              <RadarLegend data={data!} />
            </>
          )}
          {!loading && !error && columns.length < 3 && <div className="stats-empty"><p>Need at least 3 axes.</p></div>}
        </div>
      </section>
    </div>
  )
}
