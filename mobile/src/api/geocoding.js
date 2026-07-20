import Constants from 'expo-constants';

const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';

/**
 * Fetch autocomplete place suggestions as the user types.
 * Returns an array of { placeId, description }.
 */
export async function fetchPlaceSuggestions(input) {
  if (!input || input.length < 3) return [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${GOOGLE_API_KEY}&components=country:in`; // restrict to India; remove/change as needed

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') return [];
    return data.predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description,
    }));
  } catch (err) {
    console.log('Autocomplete error', err);
    return [];
  }
}

/**
 * Convert a selected place_id into lat/lng coordinates.
 */
export async function geocodePlaceId(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') throw new Error('Could not fetch location details');
  const { lat, lng } = data.result.geometry.location;
  return { latitude: lat, longitude: lng, formattedAddress: data.result.formatted_address };
}

/**
 * Fallback: geocode a raw typed address string directly (no autocomplete selection).
 * Useful if the user types a full address and hits submit without picking a suggestion.
 */
export async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results.length) {
    throw new Error(`Could not locate "${address}"`);
  }
  const { lat, lng } = data.results[0].geometry.location;
  return { latitude: lat, longitude: lng, formattedAddress: data.results[0].formatted_address };
}

// Decodes a Google encoded polyline string into an array of { latitude, longitude } points.
function decodePolyline(encoded) {
  let index = 0, lat = 0, lng = 0;
  const points = [];
  while (index < encoded.length) {
    let result = 0, shift = 0, b;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 0; shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/**
 * Fetches a road-following route between two points for map display.
 * Falls back to a straight line between the two points if the Directions API
 * is unavailable (e.g. not enabled on the API key) so the map never breaks.
 */
export async function fetchRoutePolyline(origin, destination) {
  const straightLine = [
    { latitude: origin.latitude, longitude: origin.longitude },
    { latitude: destination.latitude, longitude: destination.longitude },
  ];
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.routes?.length) return straightLine;
    return decodePolyline(data.routes[0].overview_polyline.points);
  } catch (err) {
    console.log('Directions fetch error, falling back to straight line', err);
    return straightLine;
  }
}