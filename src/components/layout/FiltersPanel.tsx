import { mapMetricOptions } from '../../config/mapMetrics'
import { useFilters } from '../../state/useFilters'
import type { GeoMode, PeriodMode } from '../../state/FilterContext'
import { isMapMetric } from '../../config/mapMetrics'

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="filter-toggle-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`filter-toggle-btn${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function FilterSelect({
  id,
  value,
  options,
  onChange,
  disabled,
  placeholder,
}: {
  id: string
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="filter-select"
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function FiltersPanel() {
  const {
    filters,
    periodOptions,
    yearOptions,
    countryOptions,
    continentOptions,
    isLoadingMetadata,
    setGeoMode,
    setCountry,
    setContinent,
    setMetric,
    setPeriodMode,
    setPeriod,
    setYear,
  } = useFilters()

  const loadingOpt = [{ label: 'Loading…', value: '' }]

  return (
    <div className="filters-panel">
      <header className="filters-panel__header">
        <h2>Filters</h2>
        <p>Applied to all dashboard tabs.</p>
      </header>

      {/* ── Metric ─────────────────────────────────────────────── */}
      <div className="filter-group">
        <label className="filter-label">Metric</label>
        <div className="metric-buttons">
          {mapMetricOptions.map((opt) => (
            <button
              key={opt.value}
              className={`metric-btn metric-btn--${opt.value.toLowerCase()}${filters.metric === opt.value ? ' active' : ''}`}
              onClick={() => { if (isMapMetric(opt.value)) setMetric(opt.value) }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Geography ──────────────────────────────────────────── */}
      <div className="filter-group">
        <label className="filter-label">Geography</label>
        <ToggleGroup
          options={[
            { label: 'Continent', value: 'continent' },
            { label: 'Country', value: 'country' },
          ]}
          value={filters.geoMode}
          onChange={(v) => setGeoMode(v as GeoMode)}
        />
        {filters.geoMode === 'continent' ? (
          <FilterSelect
            id="continent"
            value={filters.continent}
            options={continentOptions.length > 1 ? continentOptions : (isLoadingMetadata ? loadingOpt : continentOptions)}
            onChange={setContinent}
            disabled={isLoadingMetadata}
          />
        ) : (
          <FilterSelect
            id="country"
            value={filters.country}
            options={countryOptions.length > 1 ? countryOptions : (isLoadingMetadata ? loadingOpt : countryOptions)}
            onChange={setCountry}
            disabled={isLoadingMetadata}
          />
        )}
      </div>

      {/* ── Time period ────────────────────────────────────────── */}
      <div className="filter-group">
        <label className="filter-label">Time period</label>
        <ToggleGroup
          options={[
            { label: 'Quarter', value: 'quarter' },
            { label: 'Year avg', value: 'year' },
          ]}
          value={filters.periodMode}
          onChange={(v) => setPeriodMode(v as PeriodMode)}
        />
        {filters.periodMode === 'quarter' ? (
          <FilterSelect
            id="period"
            value={filters.period}
            options={periodOptions.length > 0 ? periodOptions : (isLoadingMetadata ? loadingOpt : [{ label: 'No periods', value: '' }])}
            onChange={setPeriod}
            disabled={isLoadingMetadata}
          />
        ) : (
          <FilterSelect
            id="year"
            value={filters.year}
            options={yearOptions.length > 0 ? yearOptions : (isLoadingMetadata ? loadingOpt : [{ label: 'No years', value: '' }])}
            onChange={setYear}
            disabled={isLoadingMetadata}
          />
        )}
      </div>
    </div>
  )
}
