import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';

// TODO: Set your backend base URL (use your laptop IP on same WiFi), e.g. 'http://192.168.1.10:5060'
const BASE_URL = 'http://10.12.75.192:5060';

export default function IssuesScreen() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${BASE_URL}/api/issues?`;
      if (status) url += `status=${encodeURIComponent(status)}&`;
      if (category) url += `category=${encodeURIComponent(category)}&`;
      if (priority) url += `priority=${encodeURIComponent(priority)}&`;
      const res = await fetch(url);
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
      if (Array.isArray(json)) setIssues(json);
      else Alert.alert('Error', 'Unexpected response shape');
    } catch (e) {
      Alert.alert('Network error', e.message);
    } finally {
      setLoading(false);
    }
  }, [status, category, priority]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const Item = ({ item }) => (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.category} • {item.priority} • {item.status}</Text>
        <Text style={styles.metaSmall}>{item.citizen_name} • {new Date(item.created_at).toLocaleString()}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text selectable style={styles.idText}>{item.issue_id.substring(0,8)}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Issue ID', item.issue_id)} style={styles.btnOutline}>
          <Text style={styles.btnOutlineText}>Copy ID</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={styles.h1}>Issues</Text>

      <View style={styles.filters}>
        <TextInput placeholder="Status" value={status} onChangeText={setStatus} style={styles.input} />
        <TextInput placeholder="Category" value={category} onChangeText={setCategory} style={styles.input} />
        <TextInput placeholder="Priority" value={priority} onChangeText={setPriority} style={styles.input} />
        <TouchableOpacity onPress={loadIssues} style={styles.btn}> 
          <Text style={styles.btnText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        renderItem={Item}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadIssues} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  input: { flexGrow: 1, minWidth: 100, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8, backgroundColor: '#fff' },
  btn: { backgroundColor: '#667eea', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: '700' },
  item: { flexDirection: 'row', gap: 10, backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eef2ff', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#4b5563', marginTop: 2 },
  metaSmall: { color: '#9ca3af', marginTop: 2, fontSize: 12 },
  desc: { marginTop: 6, color: '#374151' },
  idText: { fontSize: 12, color: '#6b7280' },
  btnOutline: { borderWidth: 2, borderColor: '#667eea', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  btnOutlineText: { color: '#667eea', fontWeight: '700' },
});
