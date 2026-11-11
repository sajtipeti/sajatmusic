import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Song {
  id: string;
  title: string;
  artist?: string;
  artwork?: string;
  uri: string;
  playlistName?: string;
}

export interface PlaylistFolder {
  id: string;
  name: string;
  songs: Song[];
}

const CACHE_KEY = 'cached_music_playlists_v11';

export const scanPlaylistsFolder = async (
  forceRefresh: boolean = false,
  forceNewFolder: boolean = false
): Promise<PlaylistFolder[]> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      return [];
    }

    // Lekérjük az összes audio fájlt a telefonról
    const assets = await MediaLibrary.getAssetsAsync({
      mediaType: 'audio',
      first: 10000,
    });

    const playlistsMap: { [key: string]: Song[] } = {};
    const targetPath = '/music/approotfolder/playlists/'; // A te mappád útvonala (kisbetűvel)

    assets.assets.forEach((asset) => {
      const uriLower = asset.uri.toLowerCase();
      
      // 1. Csak a saját mappánkban lévő fájlokat vesszük figyelembe
      if (uriLower.includes(targetPath)) {
        
        // Kinyerjük az almappa nevét az URI-ból
        const parts = asset.uri.split('/');
        const playlistsIndex = parts.findIndex(p => p.toLowerCase() === 'playlists');
        
        if (playlistsIndex !== -1 && parts.length > playlistsIndex + 2) {
          const folderName = decodeURIComponent(parts[playlistsIndex + 1]);
          
          if (!playlistsMap[folderName]) {
            playlistsMap[folderName] = [];
          }

          // 2. Kiterjesztés ellenőrzés
          const filenameLower = asset.filename.toLowerCase();
          if (
            filenameLower.endsWith('.mp3') ||
            filenameLower.endsWith('.m4a') ||
            filenameLower.endsWith('.wav') ||
            filenameLower.endsWith('.flac') ||
            filenameLower.endsWith('.webm')
          ) {
            playlistsMap[folderName].push({
              id: asset.id,
              title: asset.filename.replace(/\.[^/.]+$/, ""), // Teljes fájlnév kiterjesztés nélkül
              artist: ' ',
              uri: asset.uri,
              playlistName: folderName,
            });
          }
        }
      }
    });

    const result: PlaylistFolder[] = Object.keys(playlistsMap)
      .filter((key) => playlistsMap[key].length > 0)
      .map((folderName) => ({
        id: folderName,
        name: folderName,
        songs: playlistsMap[folderName],
      }));

    if (result.length > 0) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
    }

    return result;
  } catch (e) {
    return [];
  }
};

export const clearSavedFolder = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (e) {}
};