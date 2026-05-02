import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { CountryScore } from '../../services/statsApi'
import type { MapMetric } from '../../types/metrics'
import { metricToColumn } from '../../types/metrics'

type Props = {
  countryScores: CountryScore[]
  metric: MapMetric
}

const MARGIN = { top: 20, right: 48, bottom: 48, left: 108 }
const ROW_H  = 68
const DOT_R  = 5

const CONTINENT_COLORS: Record<string, string> = {
  Africa:   '#f97316',
  Americas: '#3b82f6',
  Asia:     '#10b981',
  Europe:   '#8b5cf6',
  Oceania:  '#ec4899',
}
const FALLBACK = '#94a3b8'

const METRIC_DISPLAY: Record<string, string> = {
  CCVI: 'CCVI', CLI_risk: 'Climate Risk', CON_risk: 'Conflict Risk', VUL: 'Vulnerability',
}

function beeswarm(
  items: { x: number; idx: number }[],
  halfBand: number,
  r: number,
): { x: number; y: number; idx: number }[] {
  const diam   = r * 2 + 1.5
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const placed: { x: number; y: number; idx: number }[] = []

  for (const item of sorted) {
    const maxSteps = Math.floor(halfBand / diam) + 1
    const candidates = [0]
    for (let s = 1; s <= maxSteps; s++) {
      candidates.push( s * diam)
      candidates.push(-s * diam)
    }

    let chosen = candidates[candidates.length - 1] 
    for (const cy of candidates) {
      if (Math.abs(cy) > halfBand) continue
      const fits = placed.every((p) => {
        const dx = p.x - item.x
        const dy = p.y - cy
        return dx * dx + dy * dy >= diam * diam * 0.85
      })
      if (fits) { chosen = cy; break }
    }
    placed.push({ x: item.x, y: chosen, idx: item.idx })
  }

  return placed
}

export function CountryBeeswarm({ countryScores, metric }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef  = useRef<HTMLDivElement>(null)
  const column  = metricToColumn[metric]

  useEffect(() => {
    const svg  = svgRef.current
    const wrap = wrapRef.current
    if (!svg || !wrap) return

    const data = countryScores.filter((d) => d.metric === column && d.n > 0 && isFinite(d.mean))
    if (data.length === 0) return

    const byContinent = d3.group(data, (d) => d.continent)
    const continents  = [...byContinent.keys()].sort()

    const width  = wrap.clientWidth || 520
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = continents.length * ROW_H
    const totalH = innerH + MARGIN.top + MARGIN.bottom

    const allMeans = data.map((d) => d.mean)
    const [rawMin, rawMax] = d3.extent(allMeans) as [number, number]
    const pad    = Math.max((rawMax - rawMin) * 0.06, 0.01)
    const xScale = d3.scaleLinear()
      .domain([rawMin - pad, rawMax + pad])
      .range([0, innerW])

    const yScale = d3.scaleBand()
      .domain(continents)
      .range([0, innerH])
      .padding(0.12)

    const sel = d3.select(svg)
    sel.selectAll('*').remove()
    sel.attr('width', width).attr('height', totalH)

    const g = sel.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    g.append('g')
      .call(d3.axisBottom(xScale).tickSize(innerH).tickFormat(() => ''))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,4'))

    continents.forEach((continent) => {
      const rows     = byContinent.get(continent) ?? []
      const color    = CONTINENT_COLORS[continent] ?? FALLBACK
      const bw       = yScale.bandwidth()
      const cy       = (yScale(continent) ?? 0) + bw / 2
      const halfBand = bw * 0.44

      g.append('rect')
        .attr('x', 0).attr('y', yScale(continent) ?? 0)
        .attr('width', innerW).attr('height', bw)
        .attr('fill', color).attr('fill-opacity', 0.04)

      const contMedian = d3.median(rows, (d) => d.mean) ?? 0
      g.append('line')
        .attr('x1', xScale(contMedian)).attr('x2', xScale(contMedian))
        .attr('y1', cy - halfBand * 0.7).attr('y2', cy + halfBand * 0.7)
        .attr('stroke', color).attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.55)

      const items  = rows.map((d, i) => ({ x: xScale(d.mean), idx: i }))
      const placed = beeswarm(items, halfBand, DOT_R)

      placed.forEach(({ x, y, idx }) => {
        const d = rows[idx]

        g.append('circle')
          .attr('cx', x)
          .attr('cy', cy + y)
          .attr('r', DOT_R)
          .attr('fill', color)
          .attr('fill-opacity', 0.72)
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.8)
          .attr('cursor', 'pointer')
          .on('mouseenter', (event: MouseEvent) => {
            d3.select(event.target as Element)
              .attr('r', DOT_R + 2)
              .attr('fill-opacity', 1)
              .attr('stroke-width', 1.5)

            const tip = tipRef.current
            if (!tip) return
            tip.style.opacity = '1'
            tip.style.left    = `${event.pageX + 12}px`
            tip.style.top     = `${event.pageY - 28}px`
            tip.innerHTML = `
              <div style="font-weight:700;font-size:13px;margin-bottom:3px">
                ${d.iso3}
                <span style="font-weight:400;color:#94a3b8;font-size:11px"> · ${continent}</span>
              </div>
              <div>
                <span style="color:#64748b">${METRIC_DISPLAY[column] ?? column}:</span>
                <strong> ${d.mean.toFixed(4)}</strong>
              </div>
              <div style="color:#94a3b8;font-size:10px">avg over ${d.n.toLocaleString()} grid cells</div>
            `
          })
          .on('mousemove', (event: MouseEvent) => {
            const tip = tipRef.current
            if (tip) {
              tip.style.left = `${event.pageX + 12}px`
              tip.style.top  = `${event.pageY - 28}px`
            }
          })
          .on('mouseleave', (event: MouseEvent) => {
            d3.select(event.target as Element)
              .attr('r', DOT_R)
              .attr('fill-opacity', 0.72)
              .attr('stroke-width', 0.8)
            const tip = tipRef.current
            if (tip) tip.style.opacity = '0'
          })
      })

      g.append('text')
        .attr('x', innerW + 4).attr('y', cy + 4)
        .attr('font-size', '10px').attr('fill', '#94a3b8')
        .text(`${rows.length}`)
    })

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.2f')))
      .call((ax) => ax.select('.domain').attr('stroke', '#cbd5e1'))
      .call((ax) => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px'))
      .call((ax) => ax.selectAll('line').attr('stroke', '#cbd5e1'))

    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('text')
        .attr('fill', '#334155').attr('font-size', '12px')
        .attr('font-weight', '600').attr('dx', '-6'))

    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 40)
      .attr('text-anchor', 'middle').attr('fill', '#94a3b8').attr('font-size', '11px')
      .text(`${METRIC_DISPLAY[column] ?? column} — country mean`)

    const leg = g.append('g').attr('transform', `translate(0,${innerH + 40})`)
    leg.append('circle').attr('cx', 5).attr('cy', 0).attr('r', DOT_R)
      .attr('fill', '#94a3b8').attr('fill-opacity', 0.72).attr('stroke', '#fff').attr('stroke-width', 0.8)
    leg.append('text').attr('x', 14).attr('y', 4).attr('font-size', '10px').attr('fill', '#94a3b8')
      .text('Country (mean over grid cells)')
    leg.append('line').attr('x1', 192).attr('x2', 206).attr('y1', 0).attr('y2', 0)
      .attr('stroke', '#94a3b8').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.55)
    leg.append('text').attr('x', 210).attr('y', 4).attr('font-size', '10px').attr('fill', '#94a3b8')
      .text('Continent median')

  }, [countryScores, metric])

  return (
    <div ref={wrapRef} className="chart-wrapper" style={{ width: '100%', overflow: 'visible' }}>
      <svg ref={svgRef} style={{ display: 'block', overflow: 'visible' }} />
      <div
        ref={tipRef}
        style={{
          position: 'fixed', pointerEvents: 'none', opacity: 0,
          background: 'rgba(15,23,42,0.95)', border: '1px solid #334155',
          borderRadius: '8px', padding: '9px 13px', fontSize: '12px',
          lineHeight: '1.6', color: '#e2e8f0', zIndex: 9999,
          transition: 'opacity 0.1s',
        }}
      />
    </div>
  )
}
