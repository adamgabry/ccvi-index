import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { ContinentDistribution } from '../../services/statsApi'
import type { MapMetric } from '../../types/metrics'
import { metricToColumn } from '../../types/metrics'

type Props = {
  distributions: ContinentDistribution[]
  metric: MapMetric
}

const MARGIN = { top: 16, right: 28, bottom: 44, left: 114 }
const HEIGHT = 300
const JITTER_SEED = 42

const CONTINENT_COLORS: Record<string, string> = {
  Africa:   '#f97316',
  Americas: '#3b82f6',
  Asia:     '#10b981',
  Europe:   '#8b5cf6',
  Oceania:  '#ec4899',
}
const FALLBACK = '#94a3b8'

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function beeswarm(values: number[], yScale: d3.ScaleBand<string>, continent: string, r: number) {
  const cy = (yScale(continent) ?? 0) + yScale.bandwidth() / 2
  const sorted = [...values].sort((a, b) => a - b)
  const placed: { x: number; y: number }[] = []

  for (const v of sorted) {
    let y = cy
    let placed_ = false
    for (let step = 0; step <= 20; step++) {
      const tryY = cy + (step === 0 ? 0 : (step % 2 === 1 ? 1 : -1) * Math.ceil(step / 2) * r * 1.8)
      const overlap = placed.some((p) => {
        const dx = p.x - v
        const dy = p.y - tryY
        return Math.sqrt(dx * dx + dy * dy) < r * 1.9
      })
      if (!overlap) {
        y = tryY
        placed_ = true
        break
      }
    }
    if (!placed_) y = cy
    placed.push({ x: v, y })
  }
  return placed
}

export function SwarmPlot({ distributions, metric }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const column = metricToColumn[metric]

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return
    const data = distributions.filter((d) => d.metric === column && d.n > 0)
    if (data.length === 0) return

    const width = wrapperRef.current.clientWidth || 520
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = HEIGHT - MARGIN.top - MARGIN.bottom

    const allVals = data.flatMap((d) => [d.min, d.p25, d.median, d.mean, d.p75, d.max])
    const xScale = d3.scaleLinear()
      .domain(d3.extent(allVals) as [number, number]).nice()
      .range([0, innerW])

    const continents = data.map((d) => d.continent)
    const yScale = d3.scaleBand()
      .domain(continents).range([0, innerH]).padding(0.35)

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', HEIGHT)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    g.append('g')
      .call(d3.axisBottom(xScale).tickSize(innerH).tickFormat(() => ''))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('line').attr('stroke', '#1e2436').attr('stroke-dasharray', '3,3'))

    const rng = seededRandom(JITTER_SEED)
    const DOT_R = 4

    data.forEach((d) => {
      const color = CONTINENT_COLORS[d.continent] ?? FALLBACK
      const bw = yScale.bandwidth()
      const cy = (yScale(d.continent) ?? 0) + bw / 2

      g.append('rect')
        .attr('x', 0).attr('y', yScale(d.continent) ?? 0)
        .attr('width', innerW).attr('height', bw)
        .attr('fill', color).attr('fill-opacity', 0.03)

      g.append('line')
        .attr('x1', xScale(d.p25)).attr('x2', xScale(d.p75))
        .attr('y1', cy).attr('y2', cy)
        .attr('stroke', color).attr('stroke-width', 3).attr('stroke-opacity', 0.25)
        .attr('stroke-linecap', 'round')

      const std = Math.max((d.p75 - d.p25) / 1.35, 0.001)
      const sampleCount = Math.min(60, Math.max(8, Math.round(d.n / 5000)))
      const points: number[] = []
      for (let i = 0; i < sampleCount; i++) {
       
        const u1 = Math.max(1e-10, rng())
        const u2 = rng()
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
        const v = d.mean + z * std
        const clamped = Math.max(d.min, Math.min(d.max, v))
        points.push(clamped)
      }
    
      points.push(d.min, d.p25, d.median, d.mean, d.p75, d.max)

      const swarmPts = beeswarm(points.map((v) => xScale(v)), yScale, d.continent, DOT_R)

      g.selectAll(null)
        .data(swarmPts.map((pt, i) => ({ ...pt, val: points[i] })))
        .join('circle')
        .attr('cx', (pt) => pt.x)
        .attr('cy', (pt) => pt.y)
        .attr('r', DOT_R)
        .attr('fill', color)
        .attr('fill-opacity', 0.55)
        .attr('stroke', color)
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.8)

      g.append('line')
        .attr('x1', xScale(d.median)).attr('x2', xScale(d.median))
        .attr('y1', cy - bw * 0.38).attr('y2', cy + bw * 0.38)
        .attr('stroke', color).attr('stroke-width', 2.5)

      const mx = xScale(d.mean)
      g.append('path')
        .attr('d', `M${mx},${cy - 5} L${mx + 5},${cy} L${mx},${cy + 5} L${mx - 5},${cy} Z`)
        .attr('fill', '#fff').attr('stroke', color).attr('stroke-width', 1.5)

      g.append('text')
        .attr('x', xScale(d.max) + 4).attr('y', cy + 4)
        .attr('font-size', '10px').attr('fill', '#4a5568')
        .text(`n=${d.n.toLocaleString()}`)
    })

    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.2f')))
      .call(ax => ax.select('.domain').attr('stroke', '#2a3045'))
      .call(ax => ax.selectAll('text').attr('fill', '#8892a4').attr('font-size', '11px'))
      .call(ax => ax.selectAll('line').attr('stroke', '#2a3045'))

    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call(ax => ax.select('.domain').remove())
      .call(ax => ax.selectAll('text').attr('fill', '#c8d0de').attr('font-size', '12px').attr('dx', '-4'))

    g.append('text')
      .attr('x', innerW / 2).attr('y', innerH + 36)
      .attr('text-anchor', 'middle').attr('fill', '#4a5568').attr('font-size', '11px')
      .text('Score')

    const leg = g.append('g').attr('transform', `translate(${innerW - 120},${innerH + 26})`)
    leg.append('line').attr('x1', 0).attr('x2', 12).attr('y1', 0).attr('y2', 0)
      .attr('stroke', '#8892a4').attr('stroke-width', 2.5)
    leg.append('text').attr('x', 16).attr('y', 4).attr('font-size', '10px').attr('fill', '#8892a4').text('Median')
    leg.append('path').attr('d', 'M42,0 L47,5 L42,10 L37,5 Z').attr('transform', 'translate(0,-5)')
      .attr('fill', '#fff').attr('stroke', '#8892a4').attr('stroke-width', 1.5)
    leg.append('text').attr('x', 52).attr('y', 4).attr('font-size', '10px').attr('fill', '#8892a4').text('Mean')

  }, [distributions, metric])

  return (
    <div ref={wrapperRef} className="chart-wrapper">
      <svg ref={svgRef} />
    </div>
  )
}
