import { useEffect, useMemo, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent, type Popup } from 'maplibre-gl'
import { mapMetricConfig } from '../../config/mapMetrics'
import type { CCVIMapRow } from '../../types/ccvi'
import type { MapPointProperties } from '../../types/map'
import type { MapMetric } from '../../types/metrics'
import { toMapPointFeatureCollection } from '../../utils/map/geojson'
import { formatMetricValue } from '../../utils/map/metricValue'
import { getPopupHtml } from './MapPopup'
import { MapLegend } from './MapLegend'

type CCVIMapProps = {
  rows: CCVIMapRow[]
  metric: MapMetric
}

const sourceId = 'ccvi-points'
const layerId = 'ccvi-points-layer'

export function CCVIMap({ rows, metric }: CCVIMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<Popup | null>(null)

  const featureCollection = useMemo(
    () => toMapPointFeatureCollection({ rows, metric }),
    [rows, metric],
  )

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [12, 12],
      zoom: 1.2,
      minZoom: 1,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')

    map.on('load', () => {
      map.addSource(sourceId, {
        type: 'geojson',
        data: featureCollection,
      })

      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#1e293b',
          'circle-opacity': 0.85,
          'circle-color': ['get', 'color'],
        },
      })
    })

    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false })
    popupRef.current = popup

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature || !feature.properties || !feature.geometry || feature.geometry.type !== 'Point') {
        return
      }

      const coordinates = [...feature.geometry.coordinates] as [number, number]
      const properties = feature.properties as unknown as MapPointProperties
      popup.setLngLat(coordinates).setHTML(getPopupHtml(properties)).addTo(map)
    }

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('click', layerId, handleClick)
    map.on('mouseenter', layerId, handleMouseEnter)
    map.on('mouseleave', layerId, handleMouseLeave)

    mapRef.current = map

    return () => {
      map.off('click', layerId, handleClick)
      map.off('mouseenter', layerId, handleMouseEnter)
      map.off('mouseleave', layerId, handleMouseLeave)
      popup.remove()
      map.remove()
      mapRef.current = null
    }
  }, [featureCollection])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !map.isStyleLoaded()) {
      return
    }

    const source = map.getSource(sourceId) as GeoJSONSource | undefined
    source?.setData(featureCollection)
  }, [featureCollection])

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

  const nonNullValues = rows.filter((row) => row[metric] !== null).length

  return (
    <section className="map-tab">
      <header className="map-tab__header">
        <div>
          <h2>Map</h2>
          <p>{mapMetricConfig[metric].description}</p>
        </div>
        <div className="map-tab__metric-value">
          <span>Selected metric</span>
          <strong>{mapMetricConfig[metric].label}</strong>
          <small>
            {rows.length} points · {nonNullValues} with values
          </small>
        </div>
      </header>
      <div className="map-tab__viewport-wrap">
        <div className="map-tab__viewport" ref={mapContainerRef} />
        <div className="map-tab__legend-overlay">
          <MapLegend rows={rows} metric={metric} />
        </div>
      </div>
      {rows.length === 0 ? <p className="map-tab__empty">No rows match current filters.</p> : null}
      {rows.length > 0 ? (
        <p className="map-tab__caption">
          Showing {mapMetricConfig[metric].label} as colored points.
          Example value format: {formatMetricValue(rows[0][metric])}
        </p>
      ) : null}
    </section>
  )
}
