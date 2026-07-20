import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:4000';

const api = axios.create({ baseURL: `${BASE_URL}/api` });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AuthAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  sendWorkEmailOtp: (data) => api.post('/auth/work-email/send-otp', data),
  verifyWorkEmailOtp: (data) => api.post('/auth/work-email/verify-otp', data),
};

export const UserAPI = {
  me: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  publicProfile: (id) => api.get(`/users/${id}/public`),
  savePushToken: (pushToken) => api.post('/users/push-token', { pushToken }),
};

export const RideAPI = {
  create: (data) => api.post('/rides', data),
  search: (params) => api.get('/rides/search', { params }),
  details: (id) => api.get(`/rides/${id}`),
  cancel: (id) => api.post(`/rides/${id}/cancel`),
};

export const BookingAPI = {
  create: (data) => api.post('/bookings', data),
  accept: (id) => api.post(`/bookings/${id}/accept`),
  reject: (id) => api.post(`/bookings/${id}/reject`),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }),
  start: (id, otp) => api.post(`/bookings/${id}/start`, { otp }),
  complete: (id) => api.post(`/bookings/${id}/complete`),
  mine: () => api.get('/bookings/mine'),
  incoming: () => api.get('/bookings/incoming'),
  details: (id) => api.get(`/bookings/${id}`),
  messages: (id) => api.get(`/bookings/${id}/messages`),
};

export const SavedAddressAPI = {
  mine: () => api.get('/saved-addresses/mine'),
  create: (data) => api.post('/saved-addresses', data),
  remove: (id) => api.delete(`/saved-addresses/${id}`),
};

export const PaymentAPI = {
  initiate: (bookingId) => api.post('/payments/initiate', { bookingId }),
  confirm: (paymentId) => api.post(`/payments/${paymentId}/confirm`),
};

export const RatingAPI = {
  submit: (data) => api.post('/ratings', data),
  forUser: (userId) => api.get(`/ratings/${userId}`),
};

export const VehicleAPI = {
  mine: () => api.get('/vehicles/mine'),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  remove: (id) => api.delete(`/vehicles/${id}`),
};

export const SosAPI = {
  trigger: (data) => api.post('/sos', data),
};

export default api;
