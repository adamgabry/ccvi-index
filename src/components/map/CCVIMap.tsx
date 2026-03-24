import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent, type Popup } from 'maplibre-gl'
import { mapMetricConfig } from '../../config/mapMetrics'
import type { MapPointProperties } from '../../types/map'
import type { MapMetric } from '../../types/metrics'
import { useMapBootstrapData } from '../../hooks/useMapBootstrapData'
import { useBrushZoom } from '../../hooks/useBrushZoom'
import { toMapFeatureCollections } from '../../utils/map/geojson'
import { getPopupHtml } from './MapPopup'
import { MapLegend } from './MapLegend'

type CCVIMapProps = {
  metric: MapMetric
  country: string
  period: string
}
const pointSourceId = 'ccvi-points'
const pointLayerId = 'ccvi-points-layer'

function createEmptyFeatureCollection() {
  return {
    type: 'FeatureCollection' as const,
    features: [],
  }
}

function setMapSourceData(
  map: maplibregl.Map | null,
  featureCollections: ReturnType<typeof toMapFeatureCollections>,
) {
  if (!map || !map.isStyleLoaded()) {
    return
  }

  const pointSource = map.getSource(pointSourceId) as GeoJSONSource | undefined

  pointSource?.setData(featureCollections.points)
}

export function CCVIMap({ metric, country, period }: CCVIMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const featureCollectionsRef = useRef<ReturnType<typeof toMapFeatureCollections>>({
    cells: createEmptyFeatureCollection(),
    points: createEmptyFeatureCollection(),
  })
  const [isBrushMode, setIsBrushMode] = useState(false)
  const bootstrapState = useMapBootstrapData(metric, country, period)
  const renderData = bootstrapState.data
  const featureCollections = useMemo(
    () =>
      toMapFeatureCollections({
        response: renderData,
        metric,
      }),
    [metric, renderData],
  )
  const brushZoom = useBrushZoom({
    mapRef,
    enabled: isBrushMode,
    onComplete: () => setIsBrushMode(false),
  })

  useEffect(() => {
    featureCollectionsRef.current = featureCollections
  }, [featureCollections])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

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
      map.addSource(pointSourceId, {
        type: 'geojson',
        data: createEmptyFeatureCollection(),
      })

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

      setMapSourceData(map, featureCollectionsRef.current)
    })

    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false })
    popupRef.current = popup

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature || !feature.properties) {
        return
      }

      const properties = feature.properties as unknown as MapPointProperties
      const coordinates =
        feature.geometry.type === 'Point'
          ? ([...feature.geometry.coordinates] as [number, number])
          : ([event.lngLat.lng, event.lngLat.lat] as [number, number])
      popup.setLngLat(coordinates).setHTML(getPopupHtml(properties)).addTo(map)
    }

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('click', pointLayerId, handleClick)
    map.on('mouseenter', pointLayerId, handleMouseEnter)
    map.on('mouseleave', pointLayerId, handleMouseLeave)

    mapRef.current = map

    return () => {
      map.off('click', pointLayerId, handleClick)
      map.off('mouseenter', pointLayerId, handleMouseEnter)
      map.off('mouseleave', pointLayerId, handleMouseLeave)
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    setMapSourceData(mapRef.current, featureCollections)
  }, [featureCollections])

  useEffect(() => {
    const map = mapRef.current
    const container = mapContainerRef.current

    if (!map || !container) {
      return
    }

    const observer = new ResizeObserver(() => {
      map.resize()
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section className="map-tab">
      <header className="map-tab__header">
        <div className="map-tab__header-copy">
          <h2>Map</h2>
          <p>{mapMetricConfig[metric].description}</p>
          <div className="map-tab__status-row">
            <span className="map-tab__status-chip">{period ? period.replace('-', ' ') : 'Quarter pending'}</span>
            <span className="map-tab__status-chip">{country === 'all' ? 'All countries' : country}</span>
            <span className="map-tab__status-chip">
              Raw points {renderData?.meta.returnedRows.toLocaleString() ?? '...'}
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
            onClick={() => setIsBrushMode((previous) => !previous)}
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
          <MapLegend metric={metric} domain={renderData?.meta.metricDomains[metric]} mode="raw" />
        </div>
      </div>
      {bootstrapState.error ? <p className="map-tab__empty">Map query failed: {bootstrapState.error}</p> : null}
      {!bootstrapState.error && renderData?.meta.totalRowsInExtent === 0 ? (
        <p className="map-tab__empty">No rows match the current map extent and filters.</p>
      ) : null}
      <p className="map-tab__caption">
        {renderData
          ? `Showing all ${renderData.meta.returnedRows.toLocaleString()} points for the selected quarter. Zoom and brush only change the view, not the queried dataset.`
          : 'Loading quarter snapshot points…'}
      </p>
    </section>
  )
}
