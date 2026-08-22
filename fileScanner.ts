import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAF = FileSystem.StorageAccessFramework;

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

const CACHE_KEY = 'cached_music_playlists_v6';
const SAVED_FOLDER_URI_KEY = 'saved_folder_uri_v6';

export const scanPlaylistsFolder = async (
  forceRefresh: boolean = false,
  forceNewFolder: boolean = false
): Promise<PlaylistFolder[]> => {
  try {
    if (!SAF) {
      console.log('A StorageAccessFramework modul nem érhető el ezen az eszközön.');
      return [];
    }

    let targetUri: string | null = null;
    try {
      targetUri = await AsyncStorage.getItem(SAVED_FOLDER_URI_KEY);
    } catch (e) {
      console.log('AsyncStorage olvasási hiba:', e);
    }

    if (!targetUri || forceNewFolder) {
      const permission = await SAF.requestDirectoryPermissionsAsync();

      if (!permission || !permission.granted) {
        return [];
      }

      targetUri = permission.directoryUri;
      await AsyncStorage.setItem(SAVED_FOLDER_URI_KEY, permission.directoryUri);
    }

    if (!targetUri) {
      return [];
    }

    const files = await SAF.readDirectoryAsync(targetUri);

    if (!files || files.length === 0) {
      return [];
    }

    const playlistsMap: { [key: string]: Song[] } = {};

    for (const fileUri of files) {
      try {
        const songsInFolder = await SAF.readDirectoryAsync(fileUri);

        const folderNameParts = fileUri.split('%2F');
        const folderName = decodeURIComponent(folderNameParts[folderNameParts.length - 1] || 'Lejátszási lista');

        playlistsMap[folderName] = [];

        for (const songUri of songsInFolder) {
          const songNameParts = songUri.split('%2F');
          const fullName = decodeURIComponent(songNameParts[songNameParts.length - 1] || '');
          const lowerName = fullName.toLowerCase();

          if (
            lowerName.endsWith('.mp3') ||
            lowerName.endsWith('.m4a') ||
            lowerName.endsWith('.wav') ||
            lowerName.endsWith('.flac')
          ) {
            const cleanName = fullName.substring(0, fullName.lastIndexOf('.'));
            
            // Itt adunk neki egy üres karaktert, hogy ne írja ki az appban az előadót
            let artist = ' '; 
            let title = cleanName;

            if (cleanName.includes('-')) {
              const parts = cleanName.split('-');
              artist = ' '; 
              title = parts.slice(1).join('-').trim();
            }

            playlistsMap[folderName].push({
              id: songUri,
              title: title,
              artist: artist,
              uri: songUri,
              playlistName: folderName,
            });
          }
        }
      } catch (e) {
        // Csendben átugorjuk a nem olvasható elemeket
      }
    }

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
  } catch (error: any) {
    console.log('Kritikus Hiba', error?.message || String(error));
    return [];
  }
};

export const clearSavedFolder = async () => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(SAVED_FOLDER_URI_KEY);
  } catch (e) {
    // ignore
  }
};