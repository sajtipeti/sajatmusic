# Saját Music 🎵

Egy saját fejlesztésű, Androidra optimalizált zenelejátszó alkalmazás, amely a telefon helyi tárhelyén lévő zenefájlok lejátszására szolgál. Az alkalmazás React Native (Expo) alapú, és kifejezetten az offline használatra, a stabilitásra és a letisztult, sötét felületre fókuszál.

## ✨ Főbb funkciók
*   **Helyi lejátszás:** Teljesen offline működés, internetkapcsolat nélkül.
*   **Lejátszási listák:** A zenék mappákba szervezve jelennek meg a felületen.
*   **Keresés:** Globális keresés az összes szám között, valamint helyi keresés az adott lejátszási listán belül.
*   **Queue (Sor) kezelés:** A lejátszási sor megtekintése, a jelenlegi pozíció (pl. `445/119`) és a sorrend követése.
*   **Crossfade (Áttűnés):** Beállítható hosszúságú (1-10 másodperc) finom hangerő-átmenet a számok között.
*   **Háttérlejátszás:** Értesítési sávról és zárképernyőről történő vezérlés.

## 📂 Hogyan működik a fájlrendszer?

Az alkalmazás nem egy saját belső adatbázisba másolja a fájlokat, hanem az **Android MediaStore** rendszerén keresztül olvassa be azokat. A tiszta működés érdekében az alkalmazás kizárólag egy előre meghatározott mappaszerkezetből dolgozik.

A zenék beolvasásához a következő mappastruktúrát kell létrehozni a telefon belső tárhelyén:

A Belső tárhelyen belül: \Music\Approotfolder\Playlists mappába kell helyezni zenefájlokat tartalmazó mappákat,
a betett mappák megjelennek lejátszási listákként az appban.

```text
/storage/emulated/0/Music/AppRootFolder/Playlists/
