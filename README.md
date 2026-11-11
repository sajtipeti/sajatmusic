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

Az alkalmazás az **Android MediaStore** rendszerén keresztül olvassa be a zenéket. Mivel az Android 11+ szigorú biztonsági szabályai (Scoped Storage) nem engedik, hogy az app automatikusan mappákat hozzon létre a nyilvános tárhelyen, a zenék helyes beolvasásához a felhasználónak manuálisan kell létrehoznia a következő mappastruktúrát a telefon belső tárhelyén:


/storage/emulated/0/Music/AppRootFolder/Playlists/



(A rendszer felépítése:

Gyökér mappa: AppRootFolder (Ez fogja össze az alkalmazás fájljait).

Playlists mappa: Ebben a mappában kell létrehozni az almappákat.

Almappák (Lejátszási listák): Minden egyes almappa egy-egy külön lejátszási listát jelent az alkalmazásban (pl. Rock, Kedvencek, Albumok). A zenefájlokat ezekbe az almappákba kell elhelyezni.

Az alkalmazás indításkor beolvassa a telefon zenei adatbázisát, de kizárólag azokat a fájlokat jeleníti meg, amelyek ebben a Playlists mappában (és annak almappáiban) találhatók. A mappák nevei szolgálnak a lejátszási listák címeiként.

Támogatott formátumok: .mp3, .m4a, .wav, .flac, .webm

📥 Telepítés
Töltsd le a legfrissebb .apk fájlt a Releases fülről.

Telepítsd a telefonodra (szükség lehet az "Ismeretlen forrásból származó alkalmazások" engedélyezésére).

Indítás után engedélyezd a zenei fájlokhoz való hozzáférést.

Hozd létre a fent leírt mappaszerkezetet, és másold bele a zenéidet.

Indítsd újra az alkalmazást, és a főoldalon a "Mappák beolvasása" gombbal töltsd be a listákat.

🛠️ Technológiai stack
Keretrendszer: React Native (Expo SDK 52)

Nyelv: TypeScript

Hanglejátszás: react-native-track-player (v4)

UI: React Native Reanimated, Community Slider

Fejlesztés: AI-asszisztált fejlesztés (Gemini / Claude) a kódgeneráláshoz és a hibakereséshez.

📄 Licenc
Ez a projekt az MIT License feltételei szerint használható. A részletekért lásd a LICENSE fájlt.)
