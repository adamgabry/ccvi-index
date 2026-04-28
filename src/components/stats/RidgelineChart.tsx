import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { ContinentDistribution } from '../../services/statsApi'
import type { MapMetric } from '../../types/metrics'
import { metricToColumn } from '../../types/metrics'

const METRIC_DISPLAY: Record<string, string> = {
  CCVI: 'CCVI', CLI_risk: 'Climate Risk', CON_risk: 'Conflict Risk', VUL: 'Vulnerability',
}

type Props = {
  distributions: ContinentDistribution[]
  metric: MapMetric
}

const MARGIN = { top: 8, right: 24, bottom: 40, left: 110 }
const ROW_HEIGHT = 56
const OVERLAP = 0.55

const CONTINENT_COLORS: Record<string, string> = {
  Africa: '#f97316',
  Americas: '#3b82f6',
  Asia: '#10b981',
  Europe: '#8b5cf6',
  Oceania: '#ec4899',
}
const FALLBACK = '#94a3b8'

function gaussianPdf(x: number, mean: number, std: number): number {
  if (std <= 0) return 0
  const z = (x - mean) / std
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI))
}

export function RidgelineChart({ distributions, metric }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return
    const column = metricToColumn[metric]
    const data = distributions.filter((d) => d.metric === column && d.n > 0)
    if (data.length === 0) return

    const width = wrapperRef.current.clientWidth || 500
    const innerW = width - MARGIN.left - MARGIN.right
    const totalH = MARGIN.top + data.length * ROW_HEIGHT + MARGIN.bottom

    const approxStd = (d: ContinentDistribution) => {
      const iqr = d.p75 - d.p25
      return iqr > 0 ? iqr / 1.35 : (d.max - d.min) / 6
    }

    const allVals = data.flatMap((d) => [d.min, d.max])
    const xScale = d3.scaleLinear()
      .domain(d3.extent(allVals) as [number, number]).nice()
      .range([0, innerW])

    const ticks = xScale.ticks(80)

    const curves = data.map((d) => {
      const std = approxStd(d)
      const pts = ticks.map((x) => ({ x, y: gaussianPdf(x, d.mean, std) }))
      return { d, pts, maxY: d3.max(pts, (p) => p.y) ?? 1 }
    })

    const globalMaxY = d3.max(curves, (c) => c.maxY) ?? 1
    const ridgeScale = d3.scaleLinear().domain([0, globalMaxY]).range([0, ROW_HEIGHT * (1 + OVERLAP)])

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', totalH)
    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    g.append('g')
      .call(d3.axisBottom(xScale).tickSize(totalH - MARGIN.top - MARGIN.bottom).tickFormat(() => ''))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,3'))

    curves.forEach(({ d, pts }, i) => {
      const baseline = (i + 1) * ROW_HEIGHT
      const color = CONTINENT_COLORS[d.continent] ?? FALLBACK

      const area = d3.area<{ x: number; y: number }>()
        .x((p) => xScale(p.x))
        .y0(0)
        .y1((p) => -ridgeScale(p.y))
        .curve(d3.curveBasis)

      const line = d3.line<{ x: number; y: number }>()
        .x((p) => xScale(p.x))
        .y((p) => -ridgeScale(p.y))
        .curve(d3.curveBasis)

      const rg = g.append('g').attr('transform', `translate(0,${baseline})`)

      rg.append('rect')
        .attr('x', 0).attr('y', -ROW_HEIGHT * (1 + OVERLAP))
        .attr('width', innerW).attr('height', ROW_HEIGHT * (1 + OVERLAP))
        .attr('fill', '#ffffff')

      rg.append('path').datum(pts)
        .attr('d', area)
        .attr('fill', color).attr('fill-opacity', 0.25)

      rg.append('path').datum(pts)
        .attr('d', line)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2)

      rg.append('line')
        .attr('x1', xScale(d.median)).attr('x2', xScale(d.median))
        .attr('y1', 0).attr('y2', -ridgeScale(gaussianPdf(d.median, d.mean, approxStd(d))))
        .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-dasharray', '3,2')

      g.append('text')
        .attr('x', -8).attr('y', baseline - 4)
        .attr('text-anchor', 'end').attr('font-size', '12px').attr('fill', '#334155')
        .attr('font-weight', i === 0 ? '600' : '400')
        .text(d.continent)
    })

    g.append('g').attr('transform', `translate(0,${data.length * ROW_HEIGHT})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.2f')))
      .call(ax => ax.select('.domain').attr('stroke', '#cbd5e1'))
      .call(ax => ax.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px'))
      .call(ax => ax.selectAll('line').attr('stroke', '#cbd5e1'))

    g.append('text')
      .attr('x', innerW / 2).attr('y', data.length * ROW_HEIGHT + 36)
      .attr('text-anchor', 'middle').attr('fill', '#94a3b8').attr('font-size', '11px')
      .text(METRIC_DISPLAY[column] ?? column)
  }, [distributions, metric])

  return <div ref={wrapperRef} className="chart-wrapper"><svg ref={svgRef} /></div>
}
