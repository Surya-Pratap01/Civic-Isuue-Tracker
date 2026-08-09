import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

export default function IssueDetails({ route }) {
  const { issue, baseUrl } = route.params || {};
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [upvotes, setUpvotes] = useState(issue?.upvotes || 0);
  const [downvotes, setDownvotes] = useState(issue?.downvotes || 0);
  const [deviceId, setDeviceId] = useState(null);
  const [myVote, setMyVote] = useState(0); // 1, -1, or 0

  useEffect(() => {
    return () => { // cleanup
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  useEffect(() => {
    (async () => {
      // Load or generate a device-scoped ID
      const key = 'civic_device_id';
      let id = await SecureStore.getItemAsync(key);
      if (!id) {
        id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        await SecureStore.setItemAsync(key, id);
      }
      setDeviceId(id);
      try {
        const res = await fetch(`${baseUrl}/api/vote/${issue.issue_id}?device_id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (json.success) {
          setMyVote(json.vote || 0);
          setUpvotes(json.upvotes ?? upvotes);
          setDownvotes(json.downvotes ?? downvotes);
        }
      } catch (e) {
        // non-fatal
      }
    })();
  }, []);

  if (!issue) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text>No issue data provided.</Text>
      </View>
    );
  }

  const photoUri = issue.photo_url || (issue.photo_filename ? `${baseUrl}/uploads/${issue.photo_filename}` : null);
  const voiceUri = issue.voice_note_url || (issue.voice_note_filename ? `${baseUrl}/uploads/${issue.voice_note_filename}` : null);

  const togglePlayback = async () => {
    try {
      if (!voiceUri) return;
      if (!sound) {
        const s = new Audio.Sound();
        await s.loadAsync({ uri: voiceUri });
        setSound(s);
        await s.playAsync();
        setPlaying(true);
        s.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (!status.isPlaying) {
              setPlaying(false);
            } else {
              setPlaying(true);
            }
          }
        });
      } else {
        const status = await sound.getStatusAsync();
        if (status.isPlaying) {
          await sound.pauseAsync();
          setPlaying(false);
        } else {
          await sound.playAsync();
          setPlaying(true);
        }
      }
    } catch (e) {
      Alert.alert('Playback error', e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{issue.title}</Text>
      <Text style={styles.meta}>{issue.category} • {issue.priority} • {issue.status}</Text>
      <Text style={styles.metaSmall}>ID: {issue.issue_id}</Text>
      <Text style={styles.metaSmall}>Reporter: {issue.citizen_name || 'N/A'}</Text>
      <Text style={styles.metaSmall}>Created: {new Date(issue.created_at).toLocaleString()}</Text>
      {issue.address ? <Text style={styles.metaSmall}>Address: {issue.address}</Text> : null}
      {issue.assigned_department ? <Text style={styles.metaSmall}>Department: {issue.assigned_department}</Text> : null}
      {issue.short_note ? <Text style={styles.metaSmall}>Short Note: {issue.short_note}</Text> : null}

      <View style={styles.votePill}>
        <TouchableOpacity style={styles.voteIconBtn} onPress={async () => {
          try {
            const res = await fetch(`${baseUrl}/api/vote/${issue.issue_id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'upvote', device_id: deviceId })
            });
            const json = await res.json();
            if (json.success) { setUpvotes(json.upvotes); setDownvotes(json.downvotes); setMyVote(1); }
            else Alert.alert('Vote failed', json.message || 'Try again');
          } catch (e) { Alert.alert('Network error', e.message); }
        }}>
          <Ionicons name={myVote === 1 ? 'arrow-up' : 'arrow-up-outline'} size={22} color={myVote === 1 ? '#16a34a' : '#111827'} />
        </TouchableOpacity>
        <Text style={styles.voteCount}>{formatCount(upvotes - downvotes)}</Text>
        <TouchableOpacity style={styles.voteIconBtn} onPress={async () => {
          try {
            const res = await fetch(`${baseUrl}/api/vote/${issue.issue_id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'downvote', device_id: deviceId })
            });
            const json = await res.json();
            if (json.success) { setUpvotes(json.upvotes); setDownvotes(json.downvotes); setMyVote(-1); }
            else Alert.alert('Vote failed', json.message || 'Try again');
          } catch (e) { Alert.alert('Network error', e.message); }
        }}>
          <Ionicons name={myVote === -1 ? 'arrow-down' : 'arrow-down-outline'} size={22} color={myVote === -1 ? '#ef4444' : '#111827'} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.section, { marginTop: 14 }]}>Description</Text>
      <Text style={styles.desc}>{issue.description}</Text>

      {photoUri && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.section}>Photo</Text>
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
        </View>
      )}

      {voiceUri && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.section}>Voice Note</Text>
          <TouchableOpacity style={styles.audioBtn} onPress={togglePlayback}>
            <Text style={styles.audioBtnText}>{playing ? 'Pause' : 'Play'} Voice Note</Text>
          </TouchableOpacity>
          <Text style={styles.metaSmall} numberOfLines={1}>{issue.voice_note_filename}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function formatCount(n) {
  if (typeof n !== 'number') return String(n || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n/1_000).toFixed(1)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700' },
  meta: { color: '#4b5563', marginTop: 4 },
  metaSmall: { color: '#9ca3af', marginTop: 2, fontSize: 12 },
  section: { fontWeight: '700', marginBottom: 6 },
  desc: { marginTop: 6, color: '#374151' },
  photo: { width: '100%', height: 300, maxHeight: 400, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 6, backgroundColor: '#000' },
  audioBtn: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 9999, marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 16 },
  audioBtnText: { color: '#fff', fontWeight: '700' }
  ,votePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 12, backgroundColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, marginTop: 12 },
  voteIconBtn: { padding: 6, borderRadius: 9999, backgroundColor: '#fff' },
  voteCount: { fontWeight: '700', color: '#111827', minWidth: 40, textAlign: 'center' }
});
