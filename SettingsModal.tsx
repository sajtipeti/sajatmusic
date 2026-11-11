import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAudio } from './AudioContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { crossfadeEnabled, setCrossfadeEnabled, crossfadeDuration, setCrossfadeDuration } = useAudio();

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Beállítások</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#C084FC" />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Crossfade (Átúszás)</Text>
            <Switch
              value={crossfadeEnabled}
              onValueChange={setCrossfadeEnabled}
              trackColor={{ false: '#333', true: '#6B21A8' }}
              thumbColor={crossfadeEnabled ? '#C084FC' : '#888'}
            />
          </View>

          {crossfadeEnabled && (
            <View style={styles.sliderContainer}>
              <Text style={styles.label}>Hossza: {crossfadeDuration} másodperc</Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={crossfadeDuration}
                onValueChange={setCrossfadeDuration}
                minimumTrackTintColor="#C084FC"
                maximumTrackTintColor="#333"
                thumbTintColor="#C084FC"
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '80%', backgroundColor: '#111116', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#6B21A8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { color: '#FFFFFF', fontSize: 16 },
  sliderContainer: { marginTop: 10 },
});