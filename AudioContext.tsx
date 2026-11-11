import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import TrackPlayer, {
  State,
  Capability,
  Event,
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

const defaultArtwork = Image.resolveAssetSource(require('./assets/sp2.jpeg')).uri;

export interface Song {
  id: string;
  title: string;
  artwork?: string;
  uri: string;
  playlistName?: string;
}

interface AudioContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  playSong: (song: Song, newQueue?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  // Új Crossfade beállítások
  crossfadeEnabled: boolean;
  setCrossfadeEnabled: (val: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (val: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const QUEUE_STORAGE_KEY = 'saved_playback_queue_v4';
const STATE_STORAGE_KEY = 'saved_playback_state_v4';
const CROSSFADE_ENABLED_KEY = 'crossfade_enabled';
const CROSSFADE_DURATION_KEY = 'crossfade_duration';

let isPlayerInitialized = false;

async function setupPlayer() {
  if (isPlayerInitialized) return;
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    });
    isPlayerInitialized = true;
  } catch (e) {
    console.log('TrackPlayer setup hiba:', e);
  }
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Crossfade state
  const [crossfadeEnabled, setCrossfadeEnabledState] = useState(false);
  const [crossfadeDuration, setCrossfadeDurationState] = useState(3);

  const saveState = useCallback(async (song: Song, currentQueue: Song[]) => {
    try {
      const activeTrack = await TrackPlayer.getActiveTrack();
      const activeIndex = activeTrack ? currentQueue.findIndex((s) => s.id === activeTrack.id) : 0;
      const currentPos = await TrackPlayer.getProgress().then(p => p.position).catch(() => 0);      
      await AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({
        song,
        index: activeIndex >= 0 ? activeIndex : 0,
        position: currentPos,
      }));
    } catch (e) {}
  }, []);

  // Beállítások betöltése
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const enabled = await AsyncStorage.getItem(CROSSFADE_ENABLED_KEY);
        const duration = await AsyncStorage.getItem(CROSSFADE_DURATION_KEY);
        if (enabled !== null) setCrossfadeEnabledState(enabled === 'true');
        if (duration !== null) setCrossfadeDurationState(Number(duration));
      } catch (e) {}
    };
    loadSettings();
  }, []);

  const setCrossfadeEnabled = useCallback((val: boolean) => {
    setCrossfadeEnabledState(val);
    AsyncStorage.setItem(CROSSFADE_ENABLED_KEY, String(val));
    if (!val) TrackPlayer.setVolume(1.0); // Ha kikapcsolják, visszaállítjuk a hangot
  }, []);

  const setCrossfadeDuration = useCallback((val: number) => {
    setCrossfadeDurationState(val);
    AsyncStorage.setItem(CROSSFADE_DURATION_KEY, String(val));
  }, []);

  useEffect(() => {
    const init = async () => {
      await setupPlayer();
      try {
        const savedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
        const savedState = await AsyncStorage.getItem(STATE_STORAGE_KEY);

        if (savedQueue) {
          const parsedQueue: Song[] = JSON.parse(savedQueue);
          if (parsedQueue.length === 0) return;

          setQueue(parsedQueue);
          const formattedQueue = parsedQueue.map((item) => ({
            id: item.id,
            url: item.uri,
            title: item.title,
            artist: ' ',
            album: 'Saját Music',
            artwork: item.artwork || defaultArtwork,
          }));

          await TrackPlayer.reset();
          await TrackPlayer.add(formattedQueue);

          if (savedState) {
            const { song, index, position } = JSON.parse(savedState);
            setCurrentSong(song);
            if (index !== undefined && index < parsedQueue.length) await TrackPlayer.skip(index);
            if (position && position > 0) await TrackPlayer.seekTo(position);
          }
        }
      } catch (e) {}
    };
    init();

    const stateListener = TrackPlayer.addEventListener(Event.PlaybackState, (data) => {
      setIsPlaying(data.state === State.Playing || data.state === State.Buffering);
    });

    return () => stateListener.remove();
  }, []);

  useEffect(() => {
    const listener = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
      if (event && event.track) {
        const song: Song = {
          id: event.track.id,
          title: event.track.title || 'Ismeretlen szám',
          artwork: event.track.artwork || defaultArtwork,
          uri: event.track.url,
        };
        setCurrentSong(song);
        saveState(song, queue);
      }
    });
    return () => listener.remove();
  }, [queue, saveState]);

  // A CROSSFADE LOGIKA: Folyamatosan figyeli a hátralévő időt
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (crossfadeEnabled) {
      interval = setInterval(async () => {
        try {
          const state = await TrackPlayer.getPlaybackState();
          if (state.state !== State.Playing) return;

          const { position, duration } = await TrackPlayer.getProgress();
          if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;

          const remaining = duration - position;

          if (remaining <= crossfadeDuration && remaining > 0) {
            // Fade out (lehalkítás)
            const vol = Math.max(0, remaining / crossfadeDuration);
            TrackPlayer.setVolume(vol);
          } else if (position < crossfadeDuration) {
            // Fade in (felhangosítás)
            const vol = Math.min(1, position / crossfadeDuration);
            TrackPlayer.setVolume(vol);
          } else {
            // Normál hangerő
            TrackPlayer.setVolume(1.0);
          }
        } catch (e) {}
      }, 250); // 250 ms-onként frissít
    } else {
      TrackPlayer.setVolume(1.0);
    }
    return () => clearInterval(interval);
  }, [crossfadeEnabled, crossfadeDuration]);

  const playSong = useCallback(async (song: Song, newQueue?: Song[]) => {
    try {
      await setupPlayer();
      TrackPlayer.setVolume(1.0); // Új szám indításakor max hangerő
      
      let targetQueue = queue;
      let needsReset = false;

      if (newQueue) {
        const isSame = queue.length > 0 && queue.length === newQueue.length && queue[0]?.id === newQueue[0]?.id;
        if (!isSame) {
          setQueue(newQueue);
          await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
          targetQueue = newQueue;
          needsReset = true;
        }
      } else if (queue.length === 0) needsReset = true;

      if (needsReset) {
        const formattedQueue = targetQueue.map((item) => ({
          id: item.id, url: item.uri, title: item.title, artist: ' ', album: 'Saját Music', artwork: item.artwork || defaultArtwork,
        }));
        await TrackPlayer.reset();
        await TrackPlayer.add(formattedQueue);
      }

      const indexToPlay = targetQueue.findIndex((s) => s.id === song.id);
      if (indexToPlay !== -1) await TrackPlayer.skip(indexToPlay);

      await TrackPlayer.play();
      setCurrentSong(song);
    } catch (error) {}
  }, [queue]);

  const togglePlayPause = useCallback(async () => {
    try {
      const state = await TrackPlayer.getPlaybackState();
      const isCurrentlyPlaying = (typeof state === 'object' && state !== null ? state.state : state) === State.Playing;
      if (isCurrentlyPlaying) {
        await TrackPlayer.pause();
        if (currentSong) saveState(currentSong, queue);
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {}
  }, [currentSong, queue, saveState]);

  const seekTo = useCallback(async (seconds: number) => {
    try { await TrackPlayer.seekTo(seconds); TrackPlayer.setVolume(1.0); } catch (e) {}
  }, []);

  const skipNext = useCallback(async () => {
    try { await TrackPlayer.skipToNext(); await TrackPlayer.play(); } catch (e) {}
  }, []);

  const skipPrevious = useCallback(async () => {
    try { await TrackPlayer.skipToPrevious(); await TrackPlayer.play(); } catch (e) {}
  }, []);

  const contextValue = useMemo(() => ({
    currentSong, isPlaying, queue, playSong, togglePlayPause, seekTo, skipNext, skipPrevious,
    crossfadeEnabled, setCrossfadeEnabled, crossfadeDuration, setCrossfadeDuration
  }), [currentSong, isPlaying, queue, playSong, togglePlayPause, seekTo, skipNext, skipPrevious, crossfadeEnabled, setCrossfadeEnabled, crossfadeDuration, setCrossfadeDuration]);

  return <AudioContext.Provider value={contextValue}>{children}</AudioContext.Provider>;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio-t csak AudioProvideren belül lehet használni!');
  return context;
};