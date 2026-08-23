import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, FlatList } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from './AudioContext';
import { useProgress } from 'react-native-track-player';

interface PlayerScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function PlayerScreen({ visible, onClose }: PlayerScreenProps) {
  const { currentSong, isPlaying, queue, playSong, togglePlayPause, seekTo, skipNext, skipPrevious } = useAudio();
  
  // FIX 1: Fél másodpercenként (500ms) kikényszerítjük a frissítést, így sosem fagy le!
  const progress = useProgress(500);
  
  const [isSeeking, setIsSeeking] = useState(false);
  const [sliderValue, setSliderValue] = useState(0); // Ezt az egy értéket fogjuk használni
  
  const [showQueue, setShowQueue] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');

  const position = progress.position ?? 0;
  const duration = Math.max(progress.duration || 1, position, 1);

  // SZINKRONIZÁLÁS: Csak akkor követi a zenét, ha ÉPP NEM fogod a csúszkát
  useEffect(() => {
    if (!isSeeking) {
      setSliderValue(position);
    }
  }, [position, isSeeking]);

  if (!currentSong) return null;

  const formatTime = (seconds: number) => {
    if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) return '0:00 ';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    // A jól bevált, levágás elleni szóközös módszer
    return `${mins}:${secs.toString().padStart(2, '0')} `;
  };

  const filteredQueue = queue.filter(s => s.title.toLowerCase().includes(queueSearch.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Ionicons name="chevron-down" size={32} color="#C084FC" />
          </TouchableOpacity>
        </View>

        <View style={styles.artworkContainer}>
          {currentSong.artwork && currentSong.artwork.length > 5 ? (
            <Image source={{ uri: currentSong.artwork }} style={styles.artwork} />
          ) : (
            <View style={styles.placeholderArtwork}>
              <Ionicons name="musical-notes" size={80} color="#8A2BE2" />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{currentSong.title}</Text>
        </View>

        <View style={styles.bottomControls}>
          <View style={styles.progressContainer}>
            <Slider
              style={styles.slider}
              value={sliderValue}
              minimumValue={0}
              maximumValue={duration}
              minimumTrackTintColor="#8A2BE2"
              maximumTrackTintColor="#333333"
              thumbTintColor="#8A2BE2"
              onSlidingStart={(val) => {
                setIsSeeking(true);
                setSliderValue(val);
              }}
              onValueChange={(val) => {
                // FIX 2: Húzás közben végre TÉNYLEG frissítjük a csúszka értékét, így húzható lesz!
                setSliderValue(val); 
              }}
              onSlidingComplete={async (val) => {
                setSliderValue(val);
                await seekTo(val);
                // 300ms szünetet hagyunk a TrackPlayernek a pörgetésre, mielőtt visszakapcsoljuk az autokövetést
                setTimeout(() => {
                  setIsSeeking(false);
                }, 300);
              }}
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(sliderValue)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={() => setShowQueue(!showQueue)} style={styles.controlBtn}>
              <Ionicons name="list" size={28} color={showQueue ? "#FF00FF" : "#C084FC"} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={skipPrevious} style={styles.controlBtn}>
              <Ionicons name="play-skip-back" size={36} color="#C084FC" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={40} color="#C084FC" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={skipNext} style={styles.controlBtn}>
              <Ionicons name="play-skip-forward" size={36} color="#C084FC" />
            </TouchableOpacity>
            
            <View style={{ width: 44 }} />
          </View>
        </View>

        {showQueue && (
          <View style={styles.queueSidebar}>
            <View style={styles.queueTopRow}>
              <View style={styles.queueSearchWrapper}>
                <Ionicons name="search" size={18} color="#C084FC" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.queueSearchInput}
                  placeholder="Keresés..."
                  placeholderTextColor="#666"
                  value={queueSearch}
                  onChangeText={setQueueSearch}
                />
              </View>
              <TouchableOpacity onPress={() => setShowQueue(false)} style={styles.closeQueueBtn}>
                <Ionicons name="close" size={28} color="#C084FC" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredQueue}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={({ item }) => {
                const isActive = item.id === currentSong.id;
                return (
                  <TouchableOpacity
                    style={[styles.queueItem, isActive && styles.queueItemActive]}
                    onPress={() => {
                      playSong(item, queue);
                    }}
                  >
                    <Text style={[styles.queueItemTitle, isActive && styles.queueItemTitleActive]} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 10, zIndex: 10 },
  iconBtn: { padding: 5 },
  artworkContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 20, flex: 1 },
  artwork: { width: 280, height: 280, borderRadius: 20 },
  placeholderArtwork: { width: 280, height: 280, borderRadius: 20, backgroundColor: '#000000', borderWidth: 2, borderColor: '#8A2BE2', justifyContent: 'center', alignItems: 'center' },
  infoContainer: { alignItems: 'center', paddingHorizontal: 10, marginBottom: 30 },
  title: { color: '#C084FC', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  bottomControls: { width: '100%' },
  progressContainer: { width: '100%', marginBottom: 20 },
  slider: { width: '100%', height: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  timeText: { 
    color: '#8E8E93', 
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 45,
  },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  controlBtn: { backgroundColor: '#000000', width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
  playButton: { backgroundColor: '#000000', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#8A2BE2' },
  queueSidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', backgroundColor: '#000000', borderRightWidth: 2, borderColor: '#8A2BE2', paddingTop: 50, paddingHorizontal: 10, zIndex: 20 },
  queueTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  queueSearchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 8, height: 40, borderWidth: 1, borderColor: '#8A2BE2' },
  queueSearchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  closeQueueBtn: { marginLeft: 8, padding: 4 },
  queueItem: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
  queueItemActive: { backgroundColor: 'rgba(138, 43, 226, 0.2)', borderRadius: 8, borderBottomWidth: 0 },
  queueItemTitle: { color: '#8A2BE2', fontSize: 14 },
  queueItemTitleActive: { color: '#FF00FF', fontWeight: 'bold' },
});