import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, Platform, Linking } from 'react-native';
import Reveal from '../components/Reveal';
import MapView, { Marker } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// Local backend on LAN (update if your IP changes)
const BASE_URL = 'http://10.12.75.192:5060';

// Tap-to-call helpline number (change as needed)
const HELPLINE_NUMBER = '112';

export default function ReportScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Infrastructure');
  const [address, setAddress] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState(null);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [submitting, setSubmitting] = useState(false);
  const [shortNote, setShortNote] = useState('');
  const [recording, setRecording] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);

  useEffect(() => {
    (async () => {
      // Ask permissions upfront for smoother UX
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      // Microphone permission for voice notes
      await Audio.requestPermissionsAsync();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to tag the issue location.');
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const useCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });
      // Reverse geocode
      const geos = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geos && geos.length > 0) {
        const g = geos[0];
        const addr = [g.name, g.street, g.city, g.region, g.postalCode].filter(Boolean).join(', ');
        setAddress(addr);
      }
    } catch (e) {
      Alert.alert('Location error', e.message);
    }
  };

  const submit = async () => {
    if (!citizenName || !phone || !title || !description || !category) {
      Alert.alert('Missing info', 'Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('citizen_name', citizenName);
      formData.append('citizen_phone', phone);
      if (email) formData.append('citizen_email', email);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      if (shortNote) formData.append('short_note', shortNote);
      if (address) formData.append('address', address);
      if (coords.latitude && coords.longitude) {
        formData.append('latitude', String(coords.latitude));
        formData.append('longitude', String(coords.longitude));
      }
      if (photo) {
        // RN FormData file
        const uri = photo.uri;
        const name = uri.split('/').pop() || 'photo.jpg';
        formData.append('photo', { uri, name, type: 'image/jpeg' });
      }
      if (recordedUri) {
        const name = recordedUri.split('/').pop() || 'voice_note.m4a';
        const lower = name.toLowerCase();
        let mime = 'audio/mp4'; // default for .m4a in browsers
        if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) mime = 'audio/mp4';
        else if (lower.endsWith('.aac')) mime = 'audio/aac';
        else if (lower.endsWith('.wav')) mime = 'audio/wav';
        else if (lower.endsWith('.mp3')) mime = 'audio/mpeg';
        else if (lower.endsWith('.3gp') || lower.endsWith('.3gpp')) mime = 'audio/3gpp';
        formData.append('voice_note', { uri: recordedUri, name, type: mime });
      }

      const res = await fetch(`${BASE_URL}/api/submit_issue`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = await res.text();
        Alert.alert('Server error', `${res.status} ${res.statusText}`, [
          { text: 'Details', onPress: () => Alert.alert('Response', text.slice(0, 500)) },
          { text: 'OK' }
        ]);
        return;
      }
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        Alert.alert('Invalid response from server', text.slice(0, 500));
        return;
      }
      const json = await res.json();
      if (json.success) {
        Alert.alert('Success', `Issue submitted! Your ID: ${json.issue_id}`);
        // reset
        setTitle(''); setDescription(''); setAddress(''); setPhoto(null); setShortNote(''); setRecordedUri(null);
      } else {
        Alert.alert('Error', json.message || 'Unable to submit');
      }
    } catch (e) {
      Alert.alert('Network error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Reveal delay={40}><Text style={styles.h1}>Report Issue</Text></Reveal>

      <Reveal delay={80}>
        <Text style={styles.label}>Your Name *</Text>
        <TextInput style={styles.input} value={citizenName} onChangeText={setCitizenName} placeholder="Your full name" />
      </Reveal>

      <Reveal delay={120}>
        <Text style={styles.label}>Phone *</Text>
        <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="Phone number" />
      </Reveal>

      <Reveal delay={160}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email (optional)" />
      </Reveal>

      <Reveal delay={200}>
      <Text style={styles.label}>Category *</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={category}
          onValueChange={(val) => setCategory(val)}
        >
          <Picker.Item label="Roads & Infrastructure" value="Roads & Infrastructure" />
          <Picker.Item label="Street Lighting" value="Street Lighting" />
          <Picker.Item label="Water & Drainage" value="Water & Drainage" />
          <Picker.Item label="Waste Management" value="Waste Management" />
          <Picker.Item label="Parks & Environment" value="Parks & Environment" />
          <Picker.Item label="Traffic & Transportation" value="Traffic & Transportation" />
          <Picker.Item label="Other" value="Other" />
        </Picker>
      </View>
      </Reveal>

      <Reveal delay={240}>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Brief title" />
      </Reveal>

      <Reveal delay={280}>
        <Text style={styles.label}>Description *</Text>
        <TextInput style={[styles.input, { height: 100 }]} value={description} onChangeText={setDescription} placeholder="Details" multiline />
      </Reveal>

      <Reveal delay={320}>
        <Text style={styles.label}>Short Note (optional)</Text>
        <TextInput style={styles.input} value={shortNote} onChangeText={setShortNote} placeholder="One-liner or brief note" />
      </Reveal>

      <Reveal delay={360}>
        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Address or description" />
      </Reveal>

      <Reveal delay={400}>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity style={styles.buttonOutline} onPress={useCurrentLocation}>
          <Text style={styles.buttonOutlineText}>Use GPS</Text>
        </TouchableOpacity>
        <Text style={{ alignSelf: 'center' }}>
          {coords.latitude ? `${coords.latitude.toFixed(4)}, ${coords.longitude?.toFixed(4)}` : ''}
        </Text>
      </View>
      </Reveal>

      {/* Inline Map to pin location */}
      <Reveal delay={440}>
      <View style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
        <MapView
          style={{ width: '100%', height: 220 }}
          initialRegion={{
            latitude: coords.latitude || 23.3441,
            longitude: coords.longitude || 85.3096,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          region={coords.latitude ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          } : undefined}
          onPress={async (e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setCoords({ latitude, longitude });
            try {
              const geos = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (geos && geos.length > 0) {
                const g = geos[0];
                const addr = [g.name, g.street, g.city, g.region, g.postalCode].filter(Boolean).join(', ');
                setAddress(addr);
              }
            } catch (_) {}
          }}
        >
          {coords.latitude && (
            <Marker coordinate={{ latitude: coords.latitude, longitude: coords.longitude }} title="Issue Location" />
          )}
        </MapView>
        <Text style={{ padding: 8, color: '#64748b' }}>Tap on the map to set the location. Use GPS to auto-locate.</Text>
      </View>
      </Reveal>

      {photo && (
        <Reveal delay={480}><Image source={{ uri: photo.uri }} style={{ width: '100%', height: 200, borderRadius: 10, marginTop: 10 }} /></Reveal>
      )}

      <Reveal delay={520}>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </TouchableOpacity>
      </View>
      </Reveal>

      {/* Helpline section */}
      <Reveal delay={560}>
      <View style={{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e5e7eb' }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Need immediate help?</Text>
        <Text style={{ color: '#475569', marginBottom: 10 }}>Call our civic helpline for urgent assistance.</Text>
        <TouchableOpacity
          style={[styles.button, { alignSelf: 'flex-start', backgroundColor: '#10b981' }]}
          onPress={() => Linking.openURL(`tel:${HELPLINE_NUMBER}`)}
        >
          <Text style={styles.buttonText}>Call Helpline ({HELPLINE_NUMBER})</Text>
        </TouchableOpacity>
      </View>
      </Reveal>

      {/* Voice note recorder */}
      <Reveal delay={600}>
      <View style={{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb' }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Add Voice Note (optional)</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!recording && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ef4444' }]}
              onPress={async () => {
                try {
                  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
                  const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                  );
                  setRecording(recording);
                } catch (e) {
                  Alert.alert('Recording error', e.message);
                }
              }}
            >
              <Text style={styles.buttonText}>Start Recording</Text>
            </TouchableOpacity>
          )}
          {recording && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#f59e0b' }]}
              onPress={async () => {
                try {
                  await recording.stopAndUnloadAsync();
                  const uri = recording.getURI();
                  setRecordedUri(uri);
                  setRecording(null);
                } catch (e) {
                  Alert.alert('Stop error', e.message);
                }
              }}
            >
              <Text style={styles.buttonText}>Stop Recording</Text>
            </TouchableOpacity>
          )}
          {recordedUri && !recording && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#3b82f6' }]}
              onPress={async () => {
                try {
                  const sound = new Audio.Sound();
                  await sound.loadAsync({ uri: recordedUri });
                  await sound.playAsync();
                } catch (e) {
                  Alert.alert('Playback error', e.message);
                }
              }}
            >
              <Text style={styles.buttonText}>Play Voice Note</Text>
            </TouchableOpacity>
          )}
        </View>
        {recordedUri ? <Text style={{ marginTop: 8, color: '#475569' }}>Attached: {recordedUri.split('/').pop()}</Text> : null}
      </View>
      </Reveal>
      <Reveal delay={640}>
        <TouchableOpacity style={[styles.button, { marginTop: 20, opacity: submitting ? 0.7 : 1 }]} disabled={submitting} onPress={submit}>
          <Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Submit Issue'}</Text>
        </TouchableOpacity>
      </Reveal>

      <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 12 }}>Backend: {BASE_URL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { marginTop: 10, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  pickerWrapper: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
  button: { backgroundColor: '#667eea', padding: 12, borderRadius: 10 },
  buttonText: { color: 'white', fontWeight: '700', textAlign: 'center' },
  buttonOutline: { borderWidth: 2, borderColor: '#667eea', padding: 10, borderRadius: 10 },
  buttonOutlineText: { color: '#667eea', fontWeight: '700' },
});
