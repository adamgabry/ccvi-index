import { useFilters } from '../../state/useFilters'
import { useStatsData } from '../../hooks/useStatsData'
import { SummaryTable } from '../stats/SummaryTable'
import { ViolinPlot } from '../stats/ViolinPlot'
import { CountryBeeswarm } from '../stats/CountryBeeswarm'
import { CorrelationHeatmap } from '../stats/CorrelationHeatmap'

const METRIC_LABELS: Record<string, string> = {
  CCVI: 'CCVI', Climate: 'Climate Risk', Conflict: 'Conflict Risk', Vulnerability: 'Vulnerability',
}

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

  const chartGeoLabel = filters.geoMode === 'country' && filters.country !== 'all'
    ? filters.country
    : undefined

  if (loading) {
    return (
      <div className="stats-loading">
        <span className="stats-loading__spinner" />
        <p>Loading statistics…</p>
      </div>
    )
  }

  if (error) return <div className="stats-empty"><p>⚠️ {error}</p></div>
  if (!data)  return <div className="stats-empty"><p>No data available.</p></div>

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
            Violin — <strong>{METRIC_LABELS[filters.metric] ?? filters.metric}</strong> density shape per continent
          </span>
        </header>
        <ViolinPlot
          distributions={data.continentDistributions}
          metric={filters.metric}
          geoLabel={chartGeoLabel}
        />
      </section>

      <div className="stats-row">
        <section className="stats-section stats-section--half">
          <header className="stats-section__header">
            <h3 className="stats-section__title">Country Scores</h3>
            <span className="stats-section__subtitle">
              One dot per country · hover for details
            </span>
          </header>
          <CountryBeeswarm
            countryScores={data.countryScores}
            metric={filters.metric}
            geoLabel={chartGeoLabel}
          />
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
