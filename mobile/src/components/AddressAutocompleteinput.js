import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList } from 'react-native';
import { fetchPlaceSuggestions, geocodePlaceId } from '../api/geocoding';

/**
 * Address input with a live autocomplete dropdown (Google Places).
 * Calls onLocationSelected({ latitude, longitude, address }) once the user picks a suggestion.
 * `value` is optional — pass it to reflect a selection made elsewhere (e.g. a saved-address chip).
 */
export function AddressAutocompleteInput({ placeholder, onLocationSelected, value }) {
  const [text, setText] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (value !== undefined && value !== text) setText(value);
  }, [value]);

  const handleChangeText = (value) => {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchPlaceSuggestions(value);
      setSuggestions(results);
    }, 300); // debounce so we don't hit the API on every keystroke
  };

  const handleSelect = async (item) => {
    setText(item.description);
    setSuggestions([]);
    try {
      const location = await geocodePlaceId(item.placeId);
      onLocationSelected({ ...location, address: item.description });
    } catch (err) {
      console.log('Geocode error', err);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={text}
        onChangeText={handleChangeText}
      />
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.placeId}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSelect(item)}>
                <Text style={styles.suggestionText}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12, zIndex: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 15 },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 180,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  suggestionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionText: { fontSize: 14, color: '#333' },
});