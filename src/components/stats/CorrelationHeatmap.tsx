import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { phase1MapMetrics } from '../../types/metrics'
import type { Phase1Metric } from '../../types/metrics'
import type { CorrelationEntry } from '../../services/statsApi'

type Props = { correlations: CorrelationEntry[] }

const MARGIN = { top: 60, right: 16, bottom: 16, left: 72 }

export function CorrelationHeatmap({ correlations }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current || correlations.length === 0) return
    const metrics = [...phase1MapMetrics] as Phase1Metric[]
    const n = metrics.length
    const containerW = wrapperRef.current.clientWidth || 320
    const dim = Math.min(containerW - MARGIN.left - MARGIN.right, 280)
    const cellSize = dim / n
    const totalW = dim + MARGIN.left + MARGIN.right
    const totalH = dim + MARGIN.top + MARGIN.bottom


    const PHASE1_LABELS: Record<string, string> = {
      CCVI: 'CCVI', CLI_risk: 'Climate Risk', CON_risk: 'Conflict Risk', VUL: 'Vulnerability',
    }
    // Build lookup
    const lookup = new Map<string, number>()
    for (const c of correlations) lookup.set(`${c.metric_a}|${c.metric_b}`, c.r)

    const colorScale = d3.scaleDiverging<string>()
      .domain([-1, 0, 1]).interpolator(d3.interpolateRdBu)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', totalW).attr('height', totalH)
    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    metrics.forEach((rowMetric, i) => {
      metrics.forEach((colMetric, j) => {
        const r = i === j ? 1 : (lookup.get(`${rowMetric}|${colMetric}`) ?? 0)
        const cg = g.append('g').attr('transform', `translate(${j * cellSize},${i * cellSize})`)

        cg.append('rect')
          .attr('width', cellSize - 2).attr('height', cellSize - 2).attr('rx', 4)
          .attr('fill', colorScale(r)).attr('opacity', 0.9)

        cg.append('text')
          .attr('x', cellSize / 2 - 1).attr('y', cellSize / 2 + 4)
          .attr('text-anchor', 'middle').attr('font-size', '11px').attr('font-weight', '600')
          .attr('fill', Math.abs(r) > 0.5 ? '#fff' : '#1e293b')
          .text(i === j ? '1.00' : r.toFixed(2))
      })
    })

    // Column headers
    metrics.forEach((m, j) => {
      g.append('text')
        .attr('x', j * cellSize + cellSize / 2).attr('y', -8)
        .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', '#64748b')
        .text(PHASE1_LABELS[m] ?? m)
    })

    // Row headers
    metrics.forEach((m, i) => {
      g.append('text')
        .attr('x', -8).attr('y', i * cellSize + cellSize / 2 + 4)
        .attr('text-anchor', 'end').attr('font-size', '11px').attr('fill', '#64748b')
        .text(PHASE1_LABELS[m] ?? m)
    })

    // Color scale legend
    const legendW = dim
    const legendH = 8
    const legend = g.append('g').attr('transform', `translate(0, ${dim + 16})`)
    const defs = svg.append('defs')
    const grad = defs.append('linearGradient').attr('id', 'corr-legend-grad')
    for (let i = 0; i <= 10; i++) {
      grad.append('stop')
        .attr('offset', `${i * 10}%`)
        .attr('stop-color', colorScale(-1 + (i / 10) * 2))
    }
    legend.append('rect').attr('width', legendW).attr('height', legendH).attr('rx', 2)
      .attr('fill', 'url(#corr-legend-grad)')
    legend.append('text').attr('x', 0).attr('y', legendH + 12)
      .attr('font-size', '10px').attr('fill', '#94a3b8').text('−1')
    legend.append('text').attr('x', legendW / 2).attr('y', legendH + 12)
      .attr('text-anchor', 'middle').attr('font-size', '10px').attr('fill', '#94a3b8').text('0')
    legend.append('text').attr('x', legendW).attr('y', legendH + 12)
      .attr('text-anchor', 'end').attr('font-size', '10px').attr('fill', '#94a3b8').text('+1')
  }, [correlations])

  return <div ref={wrapperRef} className="chart-wrapper"><svg ref={svgRef} /></div>
}
