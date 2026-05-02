import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { ContinentDistribution } from '../../services/statsApi'
import type { MapMetric } from '../../types/metrics'
import { metricToColumn } from '../../types/metrics'

type Props = {
  distributions: ContinentDistribution[]
  metric: MapMetric
}

const MARGIN  = { top: 20, right: 48, bottom: 48, left: 108 }
const ROW_H   = 80   
const CURVE_SAMPLES = 200

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

function gaussianPdf(x: number, mean: number, std: number): number {
  if (std <= 0) return 0
  const z = (x - mean) / std
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI))
}

function buildKdeCurve(
  d: ContinentDistribution,
  xTicks: number[],
): { x: number; density: number }[] {
  const std = Math.max((d.p75 - d.p25) / 1.35, 0.001)
  return xTicks.map((x) => ({
    x,
    density: gaussianPdf(x, d.mean, std),
  }))
}

export function ViolinPlot({ distributions, metric }: Props) {
  const svgRef     = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tipRef     = useRef<HTMLDivElement>(null)
  const column     = metricToColumn[metric]

  useEffect(() => {
    const svg  = svgRef.current
    const wrap = wrapperRef.current
    if (!svg || !wrap) return

    const data = distributions.filter((d) => d.metric === column && d.n > 0)
    if (data.length === 0) return

    const width  = wrap.clientWidth || 520
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = data.length * ROW_H
    const totalH = innerH + MARGIN.top + MARGIN.bottom

    const allVals = data.flatMap((d) => [d.min, d.max])
    const [rawMin, rawMax] = d3.extent(allVals) as [number, number]
    const pad    = (rawMax - rawMin) * 0.08
    const xScale = d3.scaleLinear()
      .domain([rawMin - pad, rawMax + pad])
      .range([0, innerW])

    const continents = data.map((d) => d.continent)
    const yScale = d3.scaleBand()
      .domain(continents).range([0, innerH]).padding(0.15)

    const xTicks = d3.range(CURVE_SAMPLES).map((i) =>
      xScale.domain()[0] + (i / (CURVE_SAMPLES - 1)) * (xScale.domain()[1] - xScale.domain()[0])
    )

    const curves = data.map((d) => ({
      d,
      pts: buildKdeCurve(d, xTicks),
    }))
    const globalMaxDensity = d3.max(curves, (c) => d3.max(c.pts, (p) => p.density)) ?? 1

    const sel = d3.select(svg)
    sel.selectAll('*').remove()
    sel.attr('width', width).attr('height', totalH)

    const g = sel.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    g.append('g')
      .call(d3.axisBottom(xScale).tickSize(innerH).tickFormat(() => ''))
      .call((ax) => ax.select('.domain').remove())
      .call((ax) => ax.selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,4'))

    curves.forEach(({ d, pts }) => {
      const color   = CONTINENT_COLORS[d.continent] ?? FALLBACK
      const bw      = yScale.bandwidth()
      const cy      = (yScale(d.continent) ?? 0) + bw / 2
      const halfVio = bw * 0.46   // max half-height of violin

      const rowMaxDensity = d3.max(pts, (p) => p.density) ?? 1
      const densityScale  = d3.scaleLinear()
        .domain([0, rowMaxDensity])
        .range([0, halfVio])

      const areaUpper = d3.area<{ x: number; density: number }>()
        .x((p) => xScale(p.x))
        .y0(cy)
        .y1((p) => cy - densityScale(p.density))
        .curve(d3.curveBasis)

      const areaLower = d3.area<{ x: number; density: number }>()
        .x((p) => xScale(p.x))
        .y0(cy)
        .y1((p) => cy + densityScale(p.density))
        .curve(d3.curveBasis)

      const lineUpper = pts.map((p) => [xScale(p.x), cy - densityScale(p.density)] as [number, number])
      const lineLower = [...pts].reverse().map((p) => [xScale(p.x), cy + densityScale(p.density)] as [number, number])
      const outlinePts = [...lineUpper, ...lineLower]
      const outlinePath = outlinePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'

      g.append('rect')
        .attr('x', 0).attr('y', yScale(d.continent) ?? 0)
        .attr('width', innerW).attr('height', bw)
        .attr('fill', color).attr('fill-opacity', 0.03)

      g.append('path').datum(pts).attr('d', areaUpper)
        .attr('fill', color).attr('fill-opacity', 0.22)
      g.append('path').datum(pts).attr('d', areaLower)
        .attr('fill', color).attr('fill-opacity', 0.22)

      g.append('path')
        .attr('d', outlinePath)
        .attr('fill', 'none')
        .attr('stroke', color).attr('stroke-width', 1.8)

      const iqrX  = xScale(d.p25)
      const iqrW  = Math.max(1, xScale(d.p75) - xScale(d.p25))
      const boxH  = halfVio * 0.45

      g.append('rect')
        .attr('x', iqrX).attr('y', cy - boxH)
        .attr('width', iqrW).attr('height', boxH * 2)
        .attr('fill', color).attr('fill-opacity', 0.25)
        .attr('stroke', color).attr('stroke-width', 1).attr('stroke-opacity', 0.5)
        .attr('rx', 2)

      for (const [x1, x2] of [[d.min, d.p25], [d.p75, d.max]] as [number, number][]) {
        g.append('line')
          .attr('x1', xScale(x1)).attr('x2', xScale(x2))
          .attr('y1', cy).attr('y2', cy)
          .attr('stroke', color).attr('stroke-width', 1.2).attr('stroke-opacity', 0.4)
        for (const xv of [x1, x2]) {
          g.append('line')
            .attr('x1', xScale(xv)).attr('x2', xScale(xv))
            .attr('y1', cy - 4).attr('y2', cy + 4)
            .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-opacity', 0.5)
        }
      }

      g.append('line')
        .attr('x1', xScale(d.median)).attr('x2', xScale(d.median))
        .attr('y1', cy - boxH).attr('y2', cy + boxH)
        .attr('stroke', color).attr('stroke-width', 2.5)

      const mx = xScale(d.mean)
      g.append('path')
        .attr('d', `M${mx},${cy - 5} L${mx + 5},${cy} L${mx},${cy + 5} L${mx - 5},${cy} Z`)
        .attr('fill', '#fff').attr('stroke', color).attr('stroke-width', 1.8)

      g.append('text')
        .attr('x', innerW + 4).attr('y', cy + 4)
        .attr('font-size', '10px').attr('fill', '#94a3b8')
        .text(`n=${d.n.toLocaleString()}`)

      g.append('rect')
        .attr('x', 0).attr('y', yScale(d.continent) ?? 0)
        .attr('width', innerW).attr('height', bw)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair')
        .on('mousemove', (event: MouseEvent) => {
          const tip = tipRef.current
          if (!tip) return
          
          const [mx] = d3.pointer(event, g.node()!)
          const val = xScale.invert(mx)
          tip.style.opacity = '1'
          tip.style.left    = `${event.pageX + 12}px`
          tip.style.top     = `${event.pageY - 28}px`
          tip.innerHTML = `
            <div style="font-weight:700;margin-bottom:3px">${d.continent}</div>
            <div><span style="color:#64748b">Value at cursor:</span> ${val.toFixed(3)}</div>
            <div><span style="color:#64748b">Min:</span> ${d.min.toFixed(3)} · <span style="color:#64748b">Max:</span> ${d.max.toFixed(3)}</div>
            <div><span style="color:#64748b">P25:</span> ${d.p25.toFixed(3)} · <span style="color:#64748b">P75:</span> ${d.p75.toFixed(3)}</div>
            <div><span style="color:#64748b">Median:</span> ${d.median.toFixed(3)} · <span style="color:#64748b">Mean:</span> ${d.mean.toFixed(3)}</div>
          `
        })
        .on('mouseleave', () => {
          const tip = tipRef.current
          if (tip) tip.style.opacity = '0'
        })
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
        .attr('fill', '#334155').attr('font-size', '12px').attr('font-weight', '600').attr('dx', '-6'))

    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 40)
      .attr('text-anchor', 'middle').attr('fill', '#94a3b8').attr('font-size', '11px')
      .text(METRIC_DISPLAY[column] ?? column)

    const leg = g.append('g').attr('transform', `translate(0,${innerH + 40})`)
    leg.append('line').attr('x1', 0).attr('x2', 0).attr('y1', -5).attr('y2', 5)
      .attr('stroke', '#94a3b8').attr('stroke-width', 2.5)
    leg.append('text').attr('x', 6).attr('y', 4).attr('font-size', '10px').attr('fill', '#94a3b8').text('Median')

    leg.append('path').attr('d', 'M74,-5 L79,0 L74,5 L69,0 Z')
      .attr('fill', '#fff').attr('stroke', '#94a3b8').attr('stroke-width', 1.8)
    leg.append('text').attr('x', 84).attr('y', 4).attr('font-size', '10px').attr('fill', '#94a3b8').text('Mean')

    leg.append('rect').attr('x', 136).attr('y', -5).attr('width', 14).attr('height', 10)
      .attr('fill', '#94a3b8').attr('fill-opacity', 0.25).attr('stroke', '#94a3b8').attr('stroke-opacity', 0.5).attr('rx', 1)
    leg.append('text').attr('x', 154).attr('y', 4).attr('font-size', '10px').attr('fill', '#94a3b8').text('IQR')

  }, [distributions, metric])

  return (
    <div ref={wrapperRef} className="chart-wrapper" style={{ width: '100%', overflow: 'visible' }}>
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
