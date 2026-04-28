import { useFilters } from '../../state/useFilters'
import { useStatsData } from '../../hooks/useStatsData'
import { SummaryTable } from '../stats/SummaryTable'
import { SwarmPlot } from '../stats/SwarmPlot'
import { CorrelationHeatmap } from '../stats/CorrelationHeatmap'
import { RidgelineChart } from '../stats/RidgelineChart'

export function StatsTab() {
  const { filters } = useFilters()

  const { data, loading, error } = useStatsData(
    filters.country,
    filters.continent,
    filters.geoMode,
    filters.period,
    filters.year,
    filters.periodMode,
  )

  const periodLabel = filters.periodMode === 'quarter'
    ? filters.period.replace('-Q', ' Q')
    : `${filters.year} (year average)`

  const geoLabel = filters.geoMode === 'country'
    ? (filters.country !== 'all' ? filters.country : 'All countries')
    : (filters.continent !== 'all' ? filters.continent : 'All continents')

  if (loading) {
    return (
      <div className="stats-loading">
        <span className="stats-loading__spinner" />
        <p>Loading statistics…</p>
      </div>
    )
  }

  if (error) {
    return <div className="stats-empty"><p>⚠️ {error}</p></div>
  }

  if (!data) {
    return <div className="stats-empty"><p>No data available.</p></div>
  }

  return (
    <div className="stats-tab">

      <section className="stats-section">
        <header className="stats-section__header">
          <h3 className="stats-section__title">Summary Statistics</h3>
          <span className="stats-section__subtitle">
            {periodLabel} · {geoLabel} · grid-cell level
          </span>
        </header>
        <SummaryTable stats={data.metricStats} activeMetric={filters.metric} />
      </section>

      <section className="stats-section">
        <header className="stats-section__header">
          <h3 className="stats-section__title">Distribution by Continent</h3>
          <span className="stats-section__subtitle">
            Ridgeline — <strong>{mapLabel(filters.metric)}</strong> density per continent
          </span>
        </header>
        <RidgelineChart distributions={data.continentDistributions} metric={filters.metric} />
      </section>

      <div className="stats-row">
        <section className="stats-section stats-section--half">
          <header className="stats-section__header">
            <h3 className="stats-section__title">Swarm Plot by Continent</h3>
            <span className="stats-section__subtitle">
              Individual data points with median and mean
            </span>
          </header>
          <SwarmPlot distributions={data.continentDistributions} metric={filters.metric} />
        </section>

        <section className="stats-section stats-section--half">
          <header className="stats-section__header">
            <h3 className="stats-section__title">Metric Correlations</h3>
            <span className="stats-section__subtitle">Pearson r between CCVI components</span>
          </header>
          <CorrelationHeatmap correlations={data.correlations} />
        </section>
      </div>

    </div>
  )
}

function mapLabel(metric: string): string {
  const labels: Record<string, string> = {
    CCVI: 'CCVI',
    Climate: 'Climate Risk',
    Conflict: 'Conflict Risk',
    Vulnerability: 'Vulnerability',
  }
  return labels[metric] ?? metric
}
