import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { BookingAPI, PaymentAPI, SosAPI } from '../api/client';
import { colors, radius, common } from '../theme';

const STATUS_COPY = {
  pending: { title: 'Waiting for driver', hint: "You'll be notified once the driver accepts or declines this request." },
  confirmed: { title: 'Booking confirmed', hint: 'Share the OTP below with your driver to start the ride.' },
  ongoing: { title: 'Ride in progress', hint: 'Have a safe trip!' },
  completed: { title: 'Ride completed', hint: 'Please complete payment and rate your driver.' },
  cancelled: { title: 'Cancelled', hint: 'This booking was declined or cancelled.' },
};

export default function BookingDetailsScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null); // { paymentId, upiUrl } once initiated
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    BookingAPI.details(bookingId)
      .then((res) => setBooking(res.data))
      .catch((err) => Alert.alert('Error', err?.response?.data?.error || 'Could not load booking'));
  };

  useEffect(load, [bookingId]);

  const openUpiApp = async (upiUrl) => {
    const canOpen = await Linking.canOpenURL(upiUrl);
    if (!canOpen) {
      Alert.alert('No UPI app found', 'Install a UPI app like Google Pay, PhonePe, or Paytm to pay.');
      return;
    }
    await Linking.openURL(upiUrl);
  };

  const handlePay = async () => {
    try {
      const { data } = await PaymentAPI.initiate(bookingId);
      setPayment({ paymentId: data.paymentId, upiUrl: data.upiUrl });
      await openUpiApp(data.upiUrl);
    } catch (err) {
      Alert.alert('Payment failed', err?.response?.data?.error || err.message || 'Please try again');
    }
  };

  const handleConfirmPayment = async () => {
    try {
      await PaymentAPI.confirm(payment.paymentId);
      Alert.alert('Thanks!', 'Payment marked as completed.');
      navigation.navigate('Rating', { bookingId, rateeId: booking.driver_id });
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not confirm payment. Please try again.');
    }
  };

  const handleSos = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      await SosAPI.trigger({ bookingId, lat: loc.coords.latitude, lng: loc.coords.longitude });
      Alert.alert('SOS sent', 'Your location has been shared with our safety team.');
    } catch (err) {
      Alert.alert('Error', 'Could not send SOS. Please call emergency services directly if needed.');
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await BookingAPI.cancel(bookingId, cancelReason.trim() || undefined);
      setShowCancelForm(false);
      load();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (!booking) return <View style={styles.container}><Text>Loading booking...</Text></View>;

  const copy = STATUS_COPY[booking.status] || { title: booking.status, hint: '' };
  const showOtp = booking.status === 'confirmed' || booking.status === 'ongoing';
  const showChat = booking.status === 'confirmed' || booking.status === 'ongoing' || booking.status === 'completed';
  const showTrack = booking.status === 'confirmed' || booking.status === 'ongoing';
  const showCancel = booking.status === 'confirmed';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.route}>{booking.origin_address} → {booking.destination_address}</Text>
      {!!copy.hint && <Text style={styles.hint}>{copy.hint}</Text>}

      {showOtp && (
        <View style={styles.otpBox}>
          <Text style={styles.otpLabel}>Share this OTP with your driver to start the ride</Text>
          <Text style={styles.otp}>{booking.otp_code}</Text>
        </View>
      )}

      <View style={styles.fareBox}>
        <Text style={styles.fareLabel}>Fare</Text>
        <Text style={styles.fare}>₹{booking.fare_amount}</Text>
      </View>

      {showTrack && (
        <TouchableOpacity
          style={common.primaryButton}
          onPress={() => navigation.navigate('TrackRide', { bookingId })}
        >
          <Text style={common.primaryButtonText}>🗺️ Track ride live</Text>
        </TouchableOpacity>
      )}

      {showChat && (
        <TouchableOpacity
          style={[common.secondaryButton, styles.spaced]}
          onPress={() => navigation.navigate('Chat', { bookingId })}
        >
          <Text style={common.secondaryButtonText}>💬 Message</Text>
        </TouchableOpacity>
      )}

      {booking.status === 'completed' && !payment && (
        <TouchableOpacity style={[common.primaryButton, styles.spaced]} onPress={handlePay}>
          <Text style={common.primaryButtonText}>Pay via UPI</Text>
        </TouchableOpacity>
      )}

      {booking.status === 'completed' && payment && (
        <>
          <TouchableOpacity style={[common.secondaryButton, styles.spaced]} onPress={() => openUpiApp(payment.upiUrl)}>
            <Text style={common.secondaryButtonText}>Open UPI app again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[common.primaryButton, styles.spaced]} onPress={handleConfirmPayment}>
            <Text style={common.primaryButtonText}>I've completed the payment</Text>
          </TouchableOpacity>
        </>
      )}

      {showCancel && !showCancelForm && (
        <TouchableOpacity style={[styles.cancelButton, styles.spaced]} onPress={() => setShowCancelForm(true)}>
          <Text style={styles.cancelButtonText}>Cancel booking</Text>
        </TouchableOpacity>
      )}

      {showCancelForm && (
        <View style={[styles.cancelForm, styles.spaced]}>
          <TextInput
            style={common.input}
            placeholder="Reason for cancelling (optional)"
            value={cancelReason}
            onChangeText={setCancelReason}
          />
          <View style={styles.cancelFormRow}>
            <TouchableOpacity style={styles.cancelFormBack} onPress={() => setShowCancelForm(false)}>
              <Text style={styles.cancelFormBackText}>Never mind</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={cancelling}>
              <Text style={styles.cancelButtonText}>{cancelling ? 'Cancelling...' : 'Confirm cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={[styles.sosButton, styles.spaced]} onPress={handleSos}>
        <Text style={styles.sosText}>🆘 SOS — Share my live location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8, color: colors.textPrimary },
  route: { color: '#555', marginBottom: 4 },
  hint: { color: '#888', fontSize: 13, marginBottom: 20 },
  otpBox: { backgroundColor: colors.primaryTint, borderRadius: radius.lg, padding: 20, alignItems: 'center', marginBottom: 20 },
  otpLabel: { color: '#555', marginBottom: 8, textAlign: 'center' },
  otp: { fontSize: 32, fontWeight: '900', letterSpacing: 8, color: colors.primary },
  fareBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bg, padding: 16, borderRadius: radius.md, marginBottom: 20 },
  fareLabel: { fontWeight: '600' },
  fare: { fontWeight: '800', color: colors.primary },
  spaced: { marginTop: 12 },
  cancelButton: { backgroundColor: colors.dangerTint, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  cancelButtonText: { color: colors.danger, fontWeight: '700' },
  cancelForm: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: 14, gap: 10 },
  cancelFormRow: { flexDirection: 'row', gap: 10 },
  cancelFormBack: { flex: 1, padding: 14, alignItems: 'center' },
  cancelFormBackText: { color: colors.textMuted, fontWeight: '600' },
  sosButton: { backgroundColor: colors.dangerTint, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  sosText: { color: colors.danger, fontWeight: '700' },
});
