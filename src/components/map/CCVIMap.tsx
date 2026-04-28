import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent, type Popup } from 'maplibre-gl'
import { mapMetricConfig } from '../../config/mapMetrics'
import type { MapPointProperties } from '../../types/map'
import type { MapMetric } from '../../types/metrics'
import { metricToColumn } from '../../types/metrics'
import { useMapBootstrapData } from '../../hooks/useMapBootstrapData'
import { useBrushZoom } from '../../hooks/useBrushZoom'
import { toMapFeatureCollections } from '../../utils/map/geojson'
import { getPopupHtml } from './MapPopup'
import { MapLegend } from './MapLegend'
import type { PeriodMode } from '../../state/FilterContext'

type CCVIMapProps = {
  metric: MapMetric
  country: string
  continent: string
  period: string
  year: string
  periodMode: PeriodMode
}

const pointSourceId = 'ccvi-points'
const pointLayerId = 'ccvi-points-layer'

function createEmptyFC() {
  return { type: 'FeatureCollection' as const, features: [] }
}

function setMapSourceData(
  map: maplibregl.Map | null,
  fcs: ReturnType<typeof toMapFeatureCollections>,
) {
  if (!map || !map.isStyleLoaded()) return
  const src = map.getSource(pointSourceId) as GeoJSONSource | undefined
  src?.setData(fcs.points)
}

export function CCVIMap({ metric, country, continent, period, year, periodMode }: CCVIMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const fcsRef = useRef<ReturnType<typeof toMapFeatureCollections>>({
    cells: createEmptyFC(),
    points: createEmptyFC(),
  })
  const [isBrushMode, setIsBrushMode] = useState(false)

  // Resolve the effective period string for bootstrap hook
  const effectivePeriod = periodMode === 'quarter' ? period : (year ? `${year}-Y` : '')

  const bootstrapState = useMapBootstrapData(metric, country, continent, effectivePeriod)
  const renderData = bootstrapState.data

  // The column name in the data for this metric
  const column = metricToColumn[metric]

  const featureCollections = useMemo(
    () => toMapFeatureCollections({ response: renderData, metric: column }),
    [column, renderData],
  )

  const brushZoom = useBrushZoom({
    mapRef,
    enabled: isBrushMode,
    onComplete: () => setIsBrushMode(false),
  })

  useEffect(() => { fcsRef.current = featureCollections }, [featureCollections])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [12, 12],
      zoom: 2,
      minZoom: 1,
      renderWorldCopies: false,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')

    map.on('load', () => {
      map.addSource(pointSourceId, { type: 'geojson', data: createEmptyFC() })
      map.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: pointSourceId,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 12, 4.5, 14, 6],
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(15, 23, 42, 0.28)',
          'circle-opacity': 0.78,
          'circle-color': ['get', 'color'],
        },
      })
      setMapSourceData(map, fcsRef.current)
    })

    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false })
    popupRef.current = popup

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature?.properties) return
      const properties = feature.properties as unknown as MapPointProperties
      const coordinates =
        feature.geometry.type === 'Point'
          ? ([...feature.geometry.coordinates] as [number, number])
          : ([event.lngLat.lng, event.lngLat.lat] as [number, number])
      popup.setLngLat(coordinates).setHTML(getPopupHtml(properties)).addTo(map)
    }

    map.on('click', pointLayerId, handleClick)
    map.on('mouseenter', pointLayerId, () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', pointLayerId, () => { map.getCanvas().style.cursor = '' })

    mapRef.current = map

    return () => {
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => { setMapSourceData(mapRef.current, featureCollections) }, [featureCollections])

  useEffect(() => {
    const map = mapRef.current
    const container = mapContainerRef.current
    if (!map || !container) return
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const periodLabel = periodMode === 'quarter'
    ? (period ? period.replace('-', ' ') : 'Quarter pending')
    : (year ? `${year} (avg)` : 'Year pending')

  const geoLabel = country !== 'all' ? country : continent !== 'all' ? continent : 'Global'

  return (
    <section className="map-tab">
      <header className="map-tab__header">
        <div className="map-tab__header-copy">
          <h2>Map</h2>
          <p>{mapMetricConfig[metric].description}</p>
          <div className="map-tab__status-row">
            <span className="map-tab__status-chip">{periodLabel}</span>
            <span className="map-tab__status-chip">{geoLabel}</span>
            <span className="map-tab__status-chip">
              {renderData?.meta.returnedRows.toLocaleString() ?? '…'} points
            </span>
          </div>
        </div>
        <div className="map-tab__metric-value">
          <span>Selected metric</span>
          <strong>{mapMetricConfig[metric].label}</strong>
          <small>
            {renderData?.mode === 'raw' ? 'Raw points' : 'Loading'} ·{' '}
            {renderData ? renderData.meta.returnedRows.toLocaleString() : '…'} rendered
          </small>
          <button
            className={`map-tab__brush-button${isBrushMode ? ' is-active' : ''}`}
            onClick={() => setIsBrushMode((prev) => !prev)}
            type="button"
          >
            {isBrushMode ? 'Cancel brush' : 'Brush zoom'}
          </button>
        </div>
      </header>
      <div className="map-tab__viewport-wrap">
        <div className="map-tab__viewport" ref={mapContainerRef} />
        <div
          className={`map-tab__brush-overlay${isBrushMode ? ' is-active' : ''}`}
          {...brushZoom.overlayProps}
        >
          {brushZoom.brushRectangle ? (
            <div
              className="map-tab__brush-rect"
              style={{
                left: brushZoom.brushRectangle.left,
                top: brushZoom.brushRectangle.top,
                width: brushZoom.brushRectangle.width,
                height: brushZoom.brushRectangle.height,
              }}
            />
          ) : null}
        </div>
        <div className="map-tab__legend-overlay">
          <MapLegend metric={metric} domain={renderData?.meta.metricDomains[column]} mode="raw" />
        </div>
      </div>
      {bootstrapState.error ? (
        <p className="map-tab__empty">Map query failed: {bootstrapState.error}</p>
      ) : null}
      {!bootstrapState.error && renderData?.meta.totalRowsInExtent === 0 ? (
        <p className="map-tab__empty">No rows match the current filters.</p>
      ) : null}
      <p className="map-tab__caption">
        {renderData
          ? `Showing ${renderData.meta.returnedRows.toLocaleString()} points for the selected period.`
          : bootstrapState.isLoading
            ? 'Loading data…'
            : 'Waiting for a valid period selection…'}
      </p>
    </section>
  )
}
