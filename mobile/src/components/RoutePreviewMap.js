import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { fetchRoutePolyline } from '../api/geocoding';
import { colors, radius } from '../theme';

/**
 * Shows a small map with pickup/drop markers and the route line between them.
 * Pass `liveMarker` ({ latitude, longitude }, e.g. a driver's live location) to
 * additionally render a moving marker — used for ride tracking.
 */
export function RoutePreviewMap({ origin, destination, liveMarker, height = 220 }) {
  const [coords, setCoords] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!origin || !destination) return;
    fetchRoutePolyline(origin, destination).then(setCoords);
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

  useEffect(() => {
    if (!mapRef.current || !origin || !destination) return;
    mapRef.current.fitToCoordinates([origin, destination], {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [coords]);

  if (!origin || !destination) return null;

  return (
    <View style={[styles.wrapper, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: (origin.latitude + destination.latitude) / 2,
          longitude: (origin.longitude + destination.longitude) / 2,
          latitudeDelta: Math.max(0.02, Math.abs(origin.latitude - destination.latitude) * 1.8),
          longitudeDelta: Math.max(0.02, Math.abs(origin.longitude - destination.longitude) * 1.8),
        }}
      >
        <Marker coordinate={origin} pinColor={colors.success} title="Pickup" />
        <Marker coordinate={destination} pinColor={colors.danger} title="Drop" />
        {liveMarker && <Marker coordinate={liveMarker} title="Driver">
          <View style={styles.liveDot} />
        </Marker>}
        {coords.length > 1 && <Polyline coordinates={coords} strokeWidth={4} strokeColor={colors.primary} />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.lg, overflow: 'hidden', marginVertical: 12 },
  liveDot: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    borderWidth: 3, borderColor: '#fff',
  },
});
