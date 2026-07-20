import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { BASE_URL, BookingAPI, UserAPI } from '../api/client';
import { fetchRoutePolyline } from '../api/geocoding';
import { colors, radius, shadow } from '../theme';

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const AVG_CITY_SPEED_KMH = 25;

export default function TrackRideScreen({ route }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const socketRef = useRef(null);
  const watchRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([BookingAPI.details(bookingId), UserAPI.me()]).then(([bookingRes, meRes]) => {
      if (!isMounted) return;
      setBooking(bookingRes.data);
      setMyUserId(meRes.data.id);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [bookingId]);

  // Route polyline between pickup and drop, drawn once we know the booking.
  useEffect(() => {
    if (!booking) return;
    const origin = { latitude: booking.pickup_lat, longitude: booking.pickup_lng };
    const destination = { latitude: booking.drop_lat, longitude: booking.drop_lng };
    fetchRoutePolyline(origin, destination).then(setRouteCoords);
  }, [booking?.id]);

  const isDriver = booking && myUserId && booking.driver_id === myUserId;

  // Socket connection: everyone joins the room; the driver also broadcasts their live position.
  useEffect(() => {
    if (!booking || !myUserId) return;
    const socket = io(BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join_booking', bookingId);

    if (!isDriver) {
      socket.on('location_update', ({ lat, lng }) => setDriverLocation({ latitude: lat, longitude: lng }));
    }

    return () => socket.disconnect();
  }, [booking?.id, myUserId, isDriver]);

  // Driver-only: stream real GPS location up to the room every few seconds.
  useEffect(() => {
    if (!isDriver) return;
    let subscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 15 },
        (loc) => {
          const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setDriverLocation(point);
          socketRef.current?.emit('location_update', { bookingId, lat: point.latitude, lng: point.longitude });
        }
      );
      watchRef.current = subscription;
    })();
    return () => watchRef.current?.remove();
  }, [isDriver, bookingId]);

  useEffect(() => {
    if (!mapRef.current || !booking) return;
    const points = [
      { latitude: booking.pickup_lat, longitude: booking.pickup_lng },
      { latitude: booking.drop_lat, longitude: booking.drop_lng },
      ...(driverLocation ? [driverLocation] : []),
    ];
    mapRef.current.fitToCoordinates(points, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
  }, [booking?.id, !!driverLocation]);

  if (!booking) return <View style={styles.container}><Text>Loading map...</Text></View>;

  const pickup = { latitude: booking.pickup_lat, longitude: booking.pickup_lng };
  const drop = { latitude: booking.drop_lat, longitude: booking.drop_lng };
  const distanceToPickup = driverLocation ? haversineKm(driverLocation, pickup) : null;
  const etaMinutes = distanceToPickup !== null ? Math.max(1, Math.round((distanceToPickup / AVG_CITY_SPEED_KMH) * 60)) : null;

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill}>
        <Marker coordinate={pickup} pinColor={colors.success} title="Pickup" />
        <Marker coordinate={drop} pinColor={colors.danger} title="Drop" />
        {routeCoords.length > 1 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor={colors.primary} />}
        {driverLocation && !isDriver && (
          <Marker coordinate={driverLocation} title="Driver">
            <View style={styles.driverDot} />
          </Marker>
        )}
      </MapView>

      {!isDriver && (
        <View style={styles.etaCard}>
          {driverLocation ? (
            <>
              <Text style={styles.etaTitle}>🚗 Driver is {distanceToPickup.toFixed(1)} km away</Text>
              <Text style={styles.etaSubtitle}>~{etaMinutes} min to pickup</Text>
            </>
          ) : (
            <Text style={styles.etaTitle}>Waiting for driver's live location...</Text>
          )}
        </View>
      )}
      {isDriver && (
        <View style={styles.etaCard}>
          <Text style={styles.etaTitle}>📍 Sharing your live location with the rider</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  driverDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff' },
  etaCard: {
    position: 'absolute', top: 16, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, ...shadow.card,
  },
  etaTitle: { fontWeight: '700', fontSize: 15, color: colors.textPrimary },
  etaSubtitle: { color: colors.textMuted, marginTop: 4 },
});
