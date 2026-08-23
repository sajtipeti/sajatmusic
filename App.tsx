import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AudioProvider, useAudio, Song } from './AudioContext';
import { scanPlaylistsFolder, PlaylistFolder } from './fileScanner';
import PlayerScreen from './PlayerScreen';

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function MainApp() {
  const {
    currentSong,
    isPlaying,
    playSong,
    togglePlayPause,
    skipNext,
    skipPrevious,
  } = useAudio();

  const [playlists, setPlaylists] = useState<PlaylistFolder[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistFolder | null>(null);

  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');

  const [isPlayerModalVisible, setPlayerModalVisible] = useState(false);

  const storagePath = '/storage/emulated/0/Music/AppRootFolder/Playlists';
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');
  }, []);

  useEffect(() => {
    (async () => {
      const folders = await scanPlaylistsFolder();
      if (folders && folders.length > 0) {
        setPlaylists(folders);
      }
    })();
  }, []);

  const formatSongs = (folder: PlaylistFolder): Song[] =>
    folder.songs.map((s) => ({
      id: s.id,
      title: s.title,
      uri: s.uri,
      playlistName: s.playlistName,
    }));

  const handlePlayPlaylist = (folder: PlaylistFolder, startSongIndex = 0, shuffle = false) => {
    let formatted = formatSongs(folder);
    if (formatted.length === 0) return;

    if (shuffle) {
      formatted = shuffleArray(formatted);
      playSong(formatted[0], formatted);
    } else {
      playSong(formatted[startSongIndex], formatted);
    }
  };

  const allSongs = playlists.flatMap((folder) =>
    folder.songs.map((song) => ({
      ...song,
      playlistName: folder.name,
    }))
  );

  const matchedGlobalSongs = globalSearchQuery.trim()
    ? allSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          s.playlistName.toLowerCase().includes(globalSearchQuery.toLowerCase())
      )
    : [];

  const filteredPlaylistSongs = selectedPlaylist
    ? selectedPlaylist.songs.filter((s) =>
        s.title.toLowerCase().includes(playlistSearchQuery.toLowerCase())
      )
    : [];

  const handleScanFolders = async () => {
    setIsScanning(true);
    try {
      const folders = await scanPlaylistsFolder(true);
      if (folders && folders.length > 0) {
        setPlaylists(folders);
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={true} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lejátszási listák</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setIsGlobalSearchOpen(!isGlobalSearchOpen)}
        >
          <Ionicons name="search" size={20} color="#C084FC" />
        </TouchableOpacity>
      </View>

      {isGlobalSearchOpen && (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#A855F7" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Keresés az összes szám között..."
            placeholderTextColor="#666"
            value={globalSearchQuery}
            onChangeText={setGlobalSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => setGlobalSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {isGlobalSearchOpen && globalSearchQuery.trim() !== '' ? (
          <FlatList
            data={matchedGlobalSongs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchMatchRow}
                onPress={() => playSong(item, matchedGlobalSongs)}
              >
                <Ionicons name="musical-note" size={18} color="#C084FC" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.songSub}>{item.playlistName}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : selectedPlaylist ? (
          <View style={{ flex: 1 }}>
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  setSelectedPlaylist(null);
                  setPlaylistSearchQuery('');
                }}
              >
                <Ionicons name="chevron-back" size={22} color="#C084FC" />
              </TouchableOpacity>
            </View>

            <View style={styles.playlistHero}>
              <View style={styles.largeArtPlaceholder}>
                <Ionicons name="musical-notes" size={50} color="#6B21A8" />
              </View>
              <Text style={styles.playlistHeroTitle}>{selectedPlaylist.name}</Text>
              <Text style={styles.playlistHeroSub}>{selectedPlaylist.songs.length} szám</Text>

              <View style={styles.playlistActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handlePlayPlaylist(selectedPlaylist, 0, true)}
                >
                  <Ionicons name="shuffle" size={22} color="#C084FC" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.playTextBtn}
                  onPress={() => handlePlayPlaylist(selectedPlaylist, 0, false)}
                >
                  <Ionicons name="play" size={20} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.playTextBtnLabel}>Lejátszás</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color="#A855F7" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Keresés itt: ${selectedPlaylist.name}...`}
                placeholderTextColor="#666"
                value={playlistSearchQuery}
                onChangeText={setPlaylistSearchQuery}
              />
            </View>

            <FlatList
              data={filteredPlaylistSongs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 120 }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.songRow}
                  onPress={() => handlePlayPlaylist(selectedPlaylist, index, false)}
                >
                  <View style={styles.smallArtPlaceholder}>
                    <Ionicons name="musical-note" size={18} color="#6B21A8" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={60} color="#333" />
                <Text style={styles.emptyText}>Nincsenek lejátszási listák</Text>
                
                <TouchableOpacity 
                  style={styles.scanBtn} 
                  onPress={handleScanFolders}
                  disabled={isScanning}
                >
                  {isScanning ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.scanBtnText}>Mappák beolvasása</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {playlists.map((pl) => (
                  <TouchableOpacity
                    key={pl.name}
                    style={styles.playlistRow}
                    onPress={() => setSelectedPlaylist(pl)}
                  >
                    <View style={styles.playlistArtPlaceholder}>
                      <Ionicons name="musical-notes" size={24} color="#6B21A8" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.playlistRowTitle}>{pl.name}</Text>
                      <Text style={styles.playlistRowSub}>{pl.songs.length} szám</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.storagePathFooter}>
              <Text style={styles.storagePathText} numberOfLines={1}>
                Mappa helye: {storagePath}
              </Text>
            </View>
          </View>
        )}
      </View>

      {currentSong && (
        <View style={styles.miniPlayerWrapper}>
          <TouchableOpacity
            style={styles.miniPlayerContainer}
            activeOpacity={0.9}
            onPress={() => setPlayerModalVisible(true)}
          >
            <View style={styles.miniPlayerArt}>
              <Ionicons name="musical-note" size={16} color="#C084FC" />
            </View>
            <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>
                {currentSong.title}
              </Text>
            </View>

            <TouchableOpacity style={styles.miniControlBtn} onPress={skipPrevious}>
              <Ionicons name="play-skip-back" size={18} color="#C084FC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.miniControlBtn} onPress={togglePlayPause}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#C084FC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.miniControlBtn} onPress={skipNext}>
              <Ionicons name="play-skip-forward" size={18} color="#C084FC" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      <PlayerScreen
        visible={isPlayerModalVisible}
        onClose={() => setPlayerModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AudioProvider>
        <MainApp />
      </AudioProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#6B21A8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B21A8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playTextBtnLabel: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111116',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 42,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#6B21A8',
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  searchMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128, 0, 128, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222228',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  playlistArtPlaceholder: {
    width: 52,
    height: 52,
    backgroundColor: '#111116',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B21A8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistRowTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  playlistRowSub: { color: '#888888', fontSize: 13, marginTop: 2 },
  detailHeader: { paddingHorizontal: 20, paddingVertical: 10 },
  playlistHero: { alignItems: 'center', paddingVertical: 12 },
  largeArtPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#111116',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6B21A8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  playlistHeroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  playlistHeroSub: { color: '#888888', fontSize: 13, marginTop: 4 },
  playlistActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  smallArtPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#111116',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  songSub: { color: '#888888', fontSize: 12, marginTop: 2 },
  storagePathFooter: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#1A1A20',
  },
  storagePathText: { color: '#555555', fontSize: 11, textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#888888', fontSize: 15, marginTop: 12, marginBottom: 20 },
  scanBtn: { backgroundColor: '#6B21A8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  scanBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  miniPlayerWrapper: { position: 'absolute', bottom: 32, left: 16, right: 16 },
  miniPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D12',
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#6B21A8',
  },
  miniPlayerArt: {
    width: 34,
    height: 34,
    backgroundColor: '#1A1A24',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  miniControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});