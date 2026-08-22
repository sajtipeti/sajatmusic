import React, { createContext, useContext, useState, useEffect } from 'react';
import TrackPlayer, {
  State,
  Capability,
  usePlaybackState,
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
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const QUEUE_STORAGE_KEY = 'saved_playback_queue_v3';
const STATE_STORAGE_KEY = 'saved_playback_state_v3';

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
      ]
    });
    isPlayerInitialized = true;
  } catch (e) {
    console.log('TrackPlayer setup hiba:', e);
  }
}

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);

  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing || playbackState.state === State.Buffering;

  useEffect(() => {
    const init = async () => {
      await setupPlayer();
      await restoreState();
    };
    init();
  }, []);

  useEffect(() => {
    const listener = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
      if (event.track) {
        const song: Song = {
          id: event.track.id,
          title: event.track.title || '',
          artwork: event.track.artwork || defaultArtwork,
          uri: event.track.url,
        };
        setCurrentSong(song);
        saveState(song);
      }
    });

    return () => {
      listener.remove();
    };
  }, [queue]);

  const saveState = async (song: Song) => {
    try {
      const activeTrack = await TrackPlayer.getActiveTrack();
      const activeIndex = activeTrack ? queue.findIndex((s) => s.id === activeTrack.id) : 0;
      const currentPos = await TrackPlayer.getProgress().then(p => p.position);      
      await AsyncStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({
        song,
        index: activeIndex >= 0 ? activeIndex : 0,
        position: currentPos,
      }));
    } catch (e) {
      console.log('Mentési hiba:', e);
    }
  };

  const restoreState = async () => {
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

          if (index !== undefined && index < parsedQueue.length) {
            await TrackPlayer.skip(index);
          }
          if (position && position > 0) {
            await TrackPlayer.seekTo(position);
          }
        }
      }
    } catch (e) {
      console.log('Visszaállítási hiba:', e);
    }
  };

  const playSong = async (song: Song, newQueue?: Song[]) => {
    await setupPlayer();

    let targetQueue = queue;
    let needsReset = false;

    // Megnézzük, hogy a kapott lista tényleg új-e (vagy ugyanazt a mappát nyitotta meg)
    if (newQueue) {
      const isSame = queue.length > 0 && queue.length === newQueue.length && queue[0].id === newQueue[0].id;
      if (!isSame) {
        setQueue(newQueue);
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
        targetQueue = newQueue;
        needsReset = true; // Csak ekkor resetelünk!
      }
    } else if (queue.length === 0) {
      needsReset = true;
    }

    // Csak akkor töröljük a lejátszót, ha TÉNYLEG új lista jött
    if (needsReset) {
      const formattedQueue = targetQueue.map((item) => ({
        id: item.id,
        url: item.uri,
        title: item.title,
        artist: ' ',
        album: 'Saját Music',
        artwork: item.artwork || defaultArtwork,
      }));
      await TrackPlayer.reset();
      await TrackPlayer.add(formattedQueue);
    }

    // Megkeressük és ráugrunk a zenére
    const indexToPlay = targetQueue.findIndex((s) => s.id === song.id);
    if (indexToPlay !== -1) {
      await TrackPlayer.skip(indexToPlay);
    }

    await TrackPlayer.play();
    setCurrentSong(song);
  };

  const togglePlayPause = async () => {
    const state = await TrackPlayer.getPlaybackState();
    // Golyóálló megoldás V3 és V4 track-player verziókhoz is
    const isCurrentlyPlaying = (typeof state === 'object' && state !== null ? state.state : state) === State.Playing;
    
    if (isCurrentlyPlaying) {
      await TrackPlayer.pause();
      if (currentSong) {
        saveState(currentSong);
      }
    } else {
      await TrackPlayer.play();
    }
  };

  const seekTo = async (seconds: number) => {
    await TrackPlayer.seekTo(seconds);
  };

  const skipNext = async () => {
    try {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
    } catch (e) {
      console.log('Sorról leértél');
    }
  };

  const skipPrevious = async () => {
    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
    } catch (e) {
      console.log('Sor elején vagy');
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        queue,
        playSong,
        togglePlayPause,
        seekTo,
        skipNext,
        skipPrevious,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio-t csak AudioProvideren belül lehet használni!');
  }
  return context;
};