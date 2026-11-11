import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from './AudioContext';
import TrackPlayer, { Event } from 'react-native-track-player';
import Slider from '@react-native-community/slider';

interface PlayerScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function PlayerScreen({ visible, onClose }: PlayerScreenProps) {
  const { currentSong, isPlaying, queue, playSong, togglePlayPause, skipNext, skipPrevious, seekTo } = useAudio();

  const [sliderRenderValue, setSliderRenderValue] = useState(0);
  const [displayDuration, setDisplayDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const [showQueue, setShowQueue] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');

  const isSeekingRef = useRef(false);
  const seekCooldownRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueListRef = useRef<FlatList | null>(null);

  const syncFromNative = React.useCallback(async () => {
    if (isSeekingRef.current || seekCooldownRef.current) return;
    try {
      const { position, duration } = await TrackPlayer.getProgress();
      if (!Number.isFinite(position) || position < 0) return;
      if (!Number.isFinite(duration) || duration <= 0) return;

      setDisplayDuration(duration);
      setSliderRenderValue(position);
    } catch {}
  }, []);

  useEffect(() => {
    if (!visible) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    syncFromNative();
    pollTimerRef.current = setInterval(syncFromNative, 500);

    const progressListener = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event: any) => {
      if (isSeekingRef.current || seekCooldownRef.current) return;
      const position = event?.position;
      const duration = event?.duration;
      if (!Number.isFinite(position) || position < 0) return;

      if (Number.isFinite(duration) && duration > 0) {
        setDisplayDuration(duration);
      }
      setSliderRenderValue(position);
    });

    const stateListener = TrackPlayer.addEventListener(Event.PlaybackState, () => syncFromNative());

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      progressListener.remove();
      stateListener.remove();
    };
  }, [visible, syncFromNative]);

  useEffect(() => {
    isSeekingRef.current = false;
    setIsSeeking(false);
    seekCooldownRef.current = false;
    setSliderRenderValue(0);
    setDisplayDuration(0);
  }, [currentSong?.id]);

  useEffect(() => {
    if (!showQueue || !currentSong || queue.length === 0) return;
    const idx = queue.findIndex((s) => s.id === currentSong.id);
    if (idx < 0) return;

    const timer = setTimeout(() => {
      try {
        queueListRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.5 });
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [showQueue, currentSong?.id, queue.length]);

  const handleScrollToIndexFailed = (info: { index: number; averageItemLength: number }) => {
    const offset = (info.averageItemLength || 50) * (info.index || 0);
    try {
      queueListRef.current?.scrollToOffset({ offset, animated: false });
      setTimeout(() => {
        try {
          queueListRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.5 });
        } catch {}
      }, 150);
    } catch {}
  };

  const handleSlidingStart = () => {
    isSeekingRef.current = true;
    setIsSeeking(true);
  };

  const handleValueChange = (val: number) => {
    setSliderRenderValue(val);
  };

  const handleSlidingComplete = async (val: number) => {
    try {
      await seekTo(val);
      seekCooldownRef.current = true;
      setTimeout(async () => {
        try {
          const { position, duration } = await TrackPlayer.getProgress();
          if (Number.isFinite(position) && position >= 0) setSliderRenderValue(position);
          if (Number.isFinite(duration) && duration > 0) setDisplayDuration(duration);
        } catch {}
        seekCooldownRef.current = false;
        isSeekingRef.current = false;
        setIsSeeking(false);
      }, 150);
    } catch (e) {
      console.log('Seek error:', e);
      seekCooldownRef.current = false;
      isSeekingRef.current = false;
      setIsSeeking(false);
    }
  };

  const queueWithIndex = useMemo(() => queue.map((song, index) => ({ song, originalIndex: index })), [queue]);
  const filteredQueue = useMemo(() => {
    return queueSearch.trim()
      ? queueWithIndex.filter(({ song }) => (song.title || '').toLowerCase().includes(queueSearch.toLowerCase()))
      : queueWithIndex;
  }, [queueWithIndex, queueSearch]);

  const currentQueueIdx = useMemo(() => (currentSong ? queue.findIndex((s) => s.id === currentSong.id) : -1), [queue, currentSong?.id]);

  if (!visible || !currentSong) return null;

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalInQueue = queue.length;
  const currentDisplay = currentQueueIdx >= 0 ? `${totalInQueue}/${currentQueueIdx + 1}` : `${totalInQueue}/-`;
  const queuePlaylistName = currentSong.playlistName || 'Lejátszási lista';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Ionicons name="chevron-down" size={32} color="#C084FC" />
          </TouchableOpacity>
        </View>

        <View style={styles.middleSection}>
          <View style={styles.artworkContainer}>
            {currentSong.artwork && currentSong.artwork.length > 5 ? (
              <Image source={{ uri: currentSong.artwork }} style={styles.artwork} />
            ) : (
              <View style={styles.placeholderArtwork}>
                <Ionicons name="musical-notes" size={80} color="#8A2BE2" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>{currentSong.title}</Text>
        </View>

        <View style={styles.bottomControls}>
          <View style={styles.progressContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={displayDuration || 1}
              value={sliderRenderValue}
              onSlidingStart={handleSlidingStart}
              onValueChange={handleValueChange}
              onSlidingComplete={handleSlidingComplete}
              minimumTrackTintColor="#8A2BE2"
              maximumTrackTintColor="#333333"
              thumbTintColor="#8A2BE2"
            />

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(sliderRenderValue)}</Text>
              <Text style={styles.timeText}>{formatTime(displayDuration)}</Text>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={() => setShowQueue(!showQueue)} style={styles.controlBtn}>
              <Ionicons name="list" size={28} color={showQueue ? '#FF00FF' : '#C084FC'} />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipPrevious} style={styles.controlBtn}>
              <Ionicons name="play-skip-back" size={36} color="#C084FC" />
            </TouchableOpacity>

            <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color="#C084FC" />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipNext} style={styles.controlBtn}>
              <Ionicons name="play-skip-forward" size={36} color="#C084FC" />
            </TouchableOpacity>

            <View style={{ width: 44 }} />
          </View>
        </View>

        {showQueue && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <TouchableOpacity style={styles.queueBackdrop} activeOpacity={1} onPress={() => setShowQueue(false)} />

            <View style={styles.queueSidebar}>
              <View style={styles.queueHeader}>
                <Text style={styles.queuePlaylistName} numberOfLines={1}>{queuePlaylistName}</Text>
                <Text style={styles.queuePositionText}>{currentDisplay}</Text>
              </View>

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

              <FlatList
                ref={(ref) => { queueListRef.current = ref; }}
                data={filteredQueue}
                keyExtractor={(item, index) => `${item.song.id}::${item.originalIndex}::${index}`}
                onScrollToIndexFailed={handleScrollToIndexFailed}
                renderItem={({ item }) => {
                  const isActive = item.song.id === currentSong.id;
                  return (
                    <TouchableOpacity
                      style={[styles.queueItem, isActive && styles.queueItemActive]}
                      onPress={() => playSong(item.song, queue)}
                    >
                      <Text style={[styles.queueItemPosition, isActive && styles.queueItemPositionActive]}>
                        {totalInQueue}/{item.originalIndex + 1}
                      </Text>
                      <Text style={[styles.queueItemTitle, isActive && styles.queueItemTitleActive]} numberOfLines={2}>
                        {item.song.title}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 10 },
  iconBtn: { padding: 5 },
  middleSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  artworkContainer: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  artwork: { width: 300, height: 300, borderRadius: 20 },
  placeholderArtwork: { width: 300, height: 300, borderRadius: 20, backgroundColor: '#000000', borderWidth: 2, borderColor: '#8A2BE2', justifyContent: 'center', alignItems: 'center' },
  infoContainer: { alignItems: 'center', paddingHorizontal: 10, marginBottom: 30 },
  title: { color: '#C084FC', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  bottomControls: { width: '100%', paddingBottom: 20 },
  progressContainer: { width: '100%', marginBottom: 30 },
  slider: { width: '100%', height: 40, marginVertical: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, marginTop: -10 },
  timeText: { color: '#8E8E93', fontSize: 13, fontVariant: ['tabular-nums'], minWidth: 45 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  controlBtn: { backgroundColor: '#000000', width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
  playButton: { backgroundColor: '#000000', width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#8A2BE2' },
  queueBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  queueSidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%', backgroundColor: '#000000', borderRightWidth: 2, borderColor: '#8A2BE2', paddingTop: 50, paddingHorizontal: 10, zIndex: 20 },
  queueHeader: { marginBottom: 12, paddingHorizontal: 4 },
  queuePlaylistName: { color: '#C084FC', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  queuePositionText: { color: '#888888', fontSize: 13, fontVariant: ['tabular-nums'] },
  queueSearchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', borderRadius: 8, paddingHorizontal: 8, height: 40, borderWidth: 1, borderColor: '#8A2BE2', marginBottom: 12 },
  queueSearchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  queueItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#222222' },
  queueItemActive: { backgroundColor: 'rgba(138, 43, 226, 0.2)', borderRadius: 8, borderBottomWidth: 0 },
  queueItemPosition: { color: '#666666', fontSize: 12, fontVariant: ['tabular-nums'], marginRight: 10, minWidth: 60 },
  queueItemPositionActive: { color: '#FF00FF', fontWeight: '600' },
  queueItemTitle: { color: '#8A2BE2', fontSize: 14, flex: 1 },
  queueItemTitleActive: { color: '#FF00FF', fontWeight: 'bold' },
});