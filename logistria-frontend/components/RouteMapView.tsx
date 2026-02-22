/**
 * RouteMapView.tsx
 * ─────────────────
 * Renders an OpenStreetMap with Leaflet inside a WebView.
 * Features:
 *   - Leaflet.markercluster for stop clustering
 *   - Polyline route connecting warehouse → all stops in order
 *   - Numbered tooltips on each stop
 *   - "Open in Google Maps" deep-link button (passed via onOpenGMaps prop)
 *
 * No native build required — works in Expo Go.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin } from 'lucide-react-native';

interface Stop {
    name: string;
    lat: number;
    lng: number;
    weather?: { condition?: string; temp_c?: number; risk?: string };
}

interface RouteMapViewProps {
    /** Warehouse origin */
    warehouse?: { lat: number; lng: number; name?: string };
    /** Ordered route stops returned from /logistics/plan */
    stops: Stop[];
    height?: number;
}

/** Build a Google Maps directions URL for the full route */
function buildGmapsUrl(
    warehouse: { lat: number; lng: number },
    stops: Stop[]
): string {
    if (!stops.length) return '';
    const origin = `${warehouse.lat},${warehouse.lng}`;
    const dest = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const waypoints = stops
        .slice(0, -1)
        .map((s) => `${s.lat},${s.lng}`)
        .join('|');
    const base = 'https://www.google.com/maps/dir/?api=1';
    const url =
        `${base}&origin=${origin}&destination=${dest}` +
        (waypoints ? `&waypoints=${waypoints}` : '') +
        `&travelmode=driving`;
    return url;
}

/** Build the self-contained Leaflet HTML */
function buildLeafletHTML(
    warehouse: { lat: number; lng: number; name?: string },
    stops: Stop[]
): string {
    const allPoints = [
        { name: warehouse.name ?? '🏭 Warehouse', lat: warehouse.lat, lng: warehouse.lng, isWarehouse: true },
        ...stops.map((s, i) => ({ name: s.name, lat: s.lat, lng: s.lng, isWarehouse: false, idx: i + 1 })),
    ];

    const routeCoords = allPoints.map((p) => [p.lat, p.lng]);

    // Center on midpoint
    const avgLat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length;

    const markersJs = allPoints
        .map((p) => {
            const color = p.isWarehouse ? '#FF8C00' : '#00C9B1';
            const label = p.isWarehouse ? '🏭' : String((p as any).idx);
            return `
        L.circleMarker([${p.lat}, ${p.lng}], {
          radius: ${p.isWarehouse ? 14 : 11},
          fillColor: '${color}',
          color: '${p.isWarehouse ? '#FFF5E0' : '#00857A'}',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        })
        .bindTooltip('${label} — ${p.name.replace(/'/g, "\\'")}', { permanent: false, direction: 'top' })
        .addTo(clusterGroup);
      `;
        })
        .join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; background:#0d1f35; }
    .leaflet-tile-pane { filter: brightness(0.82) saturate(0.7) hue-rotate(185deg); }
    .leaflet-control-zoom a { background:#0d1f35 !important; color:#FF8C00 !important; border-color:#FF8C00 !important; }
    .legend { position:absolute; bottom:24px; left:12px; z-index:1000; background:rgba(8,16,33,0.85); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; font-family:monospace; font-size:12px; color:#fff; }
    .legend span { display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:6px; vertical-align:middle; }
  </style>
</head>
<body>
<div id="map"></div>
<div class="legend">
  <div><span style="background:#FF8C00;"></span> Warehouse</div>
  <div style="margin-top:5px;"><span style="background:#00C9B1;"></span> Delivery Stop</div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
  const map = L.map('map', { zoomControl: true, attributionControl: false })
    .setView([${avgLat}, ${avgLng}], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  // Route polyline
  const routeCoords = ${JSON.stringify(routeCoords)};
  L.polyline(routeCoords, {
    color: '#FF8C00',
    weight: 3,
    opacity: 0.8,
    dashArray: '8, 6',
  }).addTo(map);

  // Clustered markers
  const clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
      return L.divIcon({
        html: '<div style="background:#FF8C00;color:#081021;font-weight:900;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:13px;">' + cluster.getChildCount() + '</div>',
        className: '',
        iconSize: [32, 32],
      });
    }
  });

  ${markersJs}

  map.addLayer(clusterGroup);

  // Fit bounds around all points
  const bounds = L.latLngBounds(routeCoords);
  map.fitBounds(bounds, { padding: [32, 32] });
</script>
</body>
</html>`;
}

export default function RouteMapView({ warehouse, stops, height = 320 }: RouteMapViewProps) {
    const wh = warehouse ?? { lat: 12.9716, lng: 77.5946, name: '🏭 Warehouse' };
    const gmapsUrl = buildGmapsUrl(wh, stops);
    const html = buildLeafletHTML(wh, stops);

    const openGmaps = () => {
        if (gmapsUrl) Linking.openURL(gmapsUrl);
    };

    return (
        <View style={[ms.wrapper, { height: height + 48 }]}>
            {/* Map */}
            <View style={[ms.mapContainer, { height }]}>
                <WebView
                    source={{ html }}
                    style={ms.webview}
                    scrollEnabled={false}
                    javaScriptEnabled
                    originWhitelist={['*']}
                    startInLoadingState
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                />
            </View>

            {/* Open in Google Maps */}
            <TouchableOpacity onPress={openGmaps} activeOpacity={0.82} style={ms.gmapsBtn}>
                <MapPin size={14} color="#081021" />
                <Text style={ms.gmapsBtnText}>OPEN ROUTE IN GOOGLE MAPS</Text>
            </TouchableOpacity>
        </View>
    );
}

const ms = StyleSheet.create({
    wrapper: { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
    mapContainer: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    webview: { flex: 1, backgroundColor: '#0d1f35' },
    gmapsBtn: {
        height: 44,
        backgroundColor: '#FF8C00',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        marginTop: 6,
        shadowColor: '#FF8C00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
    },
    gmapsBtnText: {
        fontFamily: 'SpaceMono',
        fontSize: 10,
        fontWeight: '900',
        color: '#081021',
        letterSpacing: 1.5,
    },
});
