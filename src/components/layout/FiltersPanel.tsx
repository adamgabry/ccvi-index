import {
  type RiskComponentFilter,
} from '../../state/FilterContext'
import { countryOptions, metricOptions, riskComponentOptions } from '../../state/filterOptions'
import { useFilters } from '../../state/useFilters'
import { isMapMetric } from '../../config/mapMetrics'

type FilterSelectProps = {
  id: string
  label: string
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (value: string) => void
}

function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="filter-control">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function FiltersPanel() {
  const { filters, periodOptions, isLoadingMetadata, setCountry, setMetric, setPeriod, setRiskComponent } =
    useFilters()

  return (
    <div className="filters-panel">
      <header className="filters-panel__header">
        <h2>Global Filters</h2>
        <p>These filters apply to all dashboard tabs.</p>
      </header>

      <FilterSelect
        id="country"
        label="Country"
        value={filters.country}
        options={countryOptions}
        onChange={setCountry}
      />

      <FilterSelect
        id="metric"
        label="Metric"
        value={filters.metric}
        options={metricOptions}
        onChange={(value) => {
          if (isMapMetric(value)) {
            setMetric(value)
          }
        }}
      />

      <FilterSelect
        id="period"
        label="Quarter"
        value={filters.period}
        options={
          periodOptions.length > 0
            ? periodOptions
            : [{ label: isLoadingMetadata ? 'Loading…' : 'No periods available', value: '' }]
        }
        onChange={setPeriod}
      />

      <FilterSelect
        id="risk-component"
        label="Risk component"
        value={filters.riskComponent}
        options={riskComponentOptions}
        onChange={(value) => setRiskComponent(value as RiskComponentFilter)}
      />
    </div>
  )
}
