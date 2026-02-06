const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = new Database(path.join(__dirname, 'musicwave.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT,
    genre TEXT,
    followers INTEGER DEFAULT 0,
    bio TEXT
  );

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    cover TEXT,
    release_year INTEGER,
    genre TEXT,
    FOREIGN KEY (artist_id) REFERENCES artists(id)
  );

  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    album_id TEXT,
    duration INTEGER NOT NULL,
    track_number INTEGER,
    plays INTEGER DEFAULT 0,
    audio_url TEXT,
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    FOREIGN KEY (album_id) REFERENCES albums(id)
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    is_public INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (playlist_id, song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id),
    FOREIGN KEY (song_id) REFERENCES songs(id)
  );

  CREATE TABLE IF NOT EXISTS liked_songs (
    song_id TEXT PRIMARY KEY,
    liked_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (song_id) REFERENCES songs(id)
  );

  CREATE TABLE IF NOT EXISTS recently_played (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    played_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (song_id) REFERENCES songs(id)
  );
`);

// Seed data if empty
const count = db.prepare('SELECT COUNT(*) as c FROM artists').get();
if (count.c === 0) {
  seedDatabase();
}

function seedDatabase() {
  const artists = [
    { id: uuidv4(), name: 'Luna Eclipse', image: '', genre: 'Pop', followers: 2450000, bio: 'Chart-topping pop sensation known for dreamy vocals and synth-driven melodies.' },
    { id: uuidv4(), name: 'The Midnight Riders', image: '', genre: 'Rock', followers: 1800000, bio: 'Classic rock band with a modern twist, known for epic guitar solos.' },
    { id: uuidv4(), name: 'DJ Quantum', image: '', genre: 'Electronic', followers: 3200000, bio: 'Electronic music producer pushing the boundaries of sound design.' },
    { id: uuidv4(), name: 'Aria Soul', image: '', genre: 'R&B', followers: 1500000, bio: 'Soulful R&B vocalist with Grammy-nominated albums.' },
    { id: uuidv4(), name: 'Nordic Frost', image: '', genre: 'Indie', followers: 890000, bio: 'Atmospheric indie band from Scandinavia with haunting melodies.' },
    { id: uuidv4(), name: 'Blaze MC', image: '', genre: 'Hip-Hop', followers: 4100000, bio: 'Lyrical genius redefining modern hip-hop.' },
    { id: uuidv4(), name: 'Sakura Wind', image: '', genre: 'Lo-Fi', followers: 670000, bio: 'Lo-fi beats producer creating the perfect study atmosphere.' },
    { id: uuidv4(), name: 'Crimson Orchestra', image: '', genre: 'Classical', followers: 420000, bio: 'Modern classical ensemble blending orchestral with electronic.' },
    { id: uuidv4(), name: 'Desert Storm', image: '', genre: 'Metal', followers: 1100000, bio: 'Heavy metal band known for thunderous riffs and raw energy.' },
    { id: uuidv4(), name: 'Velvet Groove', image: '', genre: 'Jazz', followers: 560000, bio: 'Contemporary jazz group with smooth, sophisticated sound.' },
  ];

  const insertArtist = db.prepare('INSERT INTO artists (id, name, image, genre, followers, bio) VALUES (?, ?, ?, ?, ?, ?)');
  const insertAlbum = db.prepare('INSERT INTO albums (id, title, artist_id, cover, release_year, genre) VALUES (?, ?, ?, ?, ?, ?)');
  const insertSong = db.prepare('INSERT INTO songs (id, title, artist_id, album_id, duration, track_number, plays, audio_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertPlaylist = db.prepare('INSERT INTO playlists (id, name, description, cover) VALUES (?, ?, ?, ?)');
  const insertPlaylistSong = db.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)');

  const albumData = {
    'Luna Eclipse': [
      { title: 'Moonlit Dreams', year: 2024, songs: ['Starfall', 'Neon Nights', 'Gravity', 'Silver Lining', 'Eclipse', 'Dreamcatcher', 'Twilight Zone', 'Cosmic Dance', 'Lunar Tide', 'Afterglow'] },
      { title: 'Celestial', year: 2023, songs: ['Orbit', 'Supernova', 'Astral Plane', 'Galaxy Girl', 'Meteor Shower', 'Constellation', 'Light Years Away', 'Solar Flare'] },
    ],
    'The Midnight Riders': [
      { title: 'Highway Anthem', year: 2024, songs: ['Thunder Road', 'Midnight Run', 'Rebel Heart', 'Iron Horse', 'Dust Trail', 'Neon Highway', 'Last Ride', 'Engine Roar', 'Wild & Free'] },
      { title: 'Electric Sunset', year: 2022, songs: ['Sunset Strip', 'Voltage', 'Chrome Heart', 'Desert Wind', 'Amplified', 'Breaking Through', 'Night Drive'] },
    ],
    'DJ Quantum': [
      { title: 'Frequency', year: 2024, songs: ['Bass Drop', 'Waveform', 'Synth City', 'Digital Rain', 'Pulse', 'Neon Grid', 'Circuit Break', 'Frequency Shift', 'Echo Chamber', 'Zero Gravity', 'System Override'] },
      { title: 'Dimension X', year: 2023, songs: ['Portal', 'Hyperspace', 'Glitch', 'Binary Sun', 'Data Stream', 'Quantum Leap', 'Matrix', 'Pixel Storm'] },
    ],
    'Aria Soul': [
      { title: 'Velvet Whispers', year: 2024, songs: ['Silk & Honey', 'Midnight Serenade', 'Golden Hour', 'Whispered Promises', 'Tender', 'Satin Dreams', 'Deep Blue', 'Warm Embrace'] },
      { title: 'Heart Strings', year: 2022, songs: ['Heartbeat', 'Soul Fire', 'Rhythm of Love', 'Gentle Storm', 'Unspoken', 'Breathe', 'Close to You'] },
    ],
    'Nordic Frost': [
      { title: 'Aurora', year: 2024, songs: ['Northern Lights', 'Frozen Lake', 'Pine Forest', 'Snowfall', 'Winter Sun', 'Ice Crystal', 'Midnight Sun', 'Fjord'] },
    ],
    'Blaze MC': [
      { title: 'Fire & Flow', year: 2024, songs: ['Inferno', 'Street Poetry', 'Crown Heavy', 'Real Ones', 'Smoke Signal', 'Rise Up', 'Legacy', 'No Limits', 'Empire State', 'King\'s Speech'] },
      { title: 'Underground King', year: 2023, songs: ['Concrete Jungle', 'Bars of Gold', 'Night Shift', 'Hustle Hard', 'Diamond Mind', 'Street Lights', 'Top Floor'] },
    ],
    'Sakura Wind': [
      { title: 'Calm Waves', year: 2024, songs: ['Morning Dew', 'Rainy Afternoon', 'Coffee Shop', 'Gentle Breeze', 'Paper Cranes', 'Sunset Walk', 'Stargazing', 'Sleepy Town', 'Warm Tea', 'Midnight Study'] },
    ],
    'Crimson Orchestra': [
      { title: 'Symphonic Dreams', year: 2024, songs: ['Overture in D Minor', 'Waltz of Shadows', 'Crescendo', 'Nocturne', 'Rhapsody in Blue', 'Adagio', 'Finale'] },
    ],
    'Desert Storm': [
      { title: 'Thunderstrike', year: 2024, songs: ['Wrath', 'Iron Maiden', 'Hellfire', 'Scorched Earth', 'Battle Cry', 'Oblivion', 'Ragnarok', 'Valhalla'] },
    ],
    'Velvet Groove': [
      { title: 'Smooth Operator', year: 2024, songs: ['Blue Note', 'Sax Appeal', 'Midnight Jazz', 'Cool Breeze', 'Swing Time', 'Groove Theory', 'Mellow Gold', 'Last Call'] },
    ],
  };

  const allSongs = [];

  const transaction = db.transaction(() => {
    for (const artist of artists) {
      insertArtist.run(artist.id, artist.name, artist.image, artist.genre, artist.followers, artist.bio);

      const artistAlbums = albumData[artist.name] || [];
      for (const album of artistAlbums) {
        const albumId = uuidv4();
        insertAlbum.run(albumId, album.title, artist.id, '', album.year, artist.genre);

        for (let i = 0; i < album.songs.length; i++) {
          const songId = uuidv4();
          const duration = 180 + Math.floor(Math.random() * 120); // 3-5 minutes
          const plays = Math.floor(Math.random() * 50000000);
          insertSong.run(songId, album.songs[i], artist.id, albumId, duration, i + 1, plays, '');
          allSongs.push({ id: songId, genre: artist.genre });
        }
      }
    }

    // Create curated playlists
    const playlists = [
      { name: 'Today\'s Top Hits', description: 'The biggest songs right now', genre: null },
      { name: 'Chill Vibes', description: 'Kick back and relax with these mellow tunes', genre: 'Lo-Fi' },
      { name: 'Rock Classics', description: 'Rock legends and modern anthems', genre: 'Rock' },
      { name: 'Hip-Hop Heat', description: 'The hottest tracks in hip-hop', genre: 'Hip-Hop' },
      { name: 'Electronic Pulse', description: 'High energy electronic beats', genre: 'Electronic' },
      { name: 'Soul & R&B', description: 'Smooth grooves for the soul', genre: 'R&B' },
      { name: 'Late Night Jazz', description: 'Sophisticated jazz for midnight hours', genre: 'Jazz' },
      { name: 'Focus Flow', description: 'Instrumentals to help you concentrate', genre: null },
    ];

    for (const pl of playlists) {
      const playlistId = uuidv4();
      insertPlaylist.run(playlistId, pl.name, pl.description, '');

      let playlistSongs;
      if (pl.genre) {
        playlistSongs = allSongs.filter(s => s.genre === pl.genre).slice(0, 15);
      } else {
        // Random mix for general playlists
        const shuffled = [...allSongs].sort(() => Math.random() - 0.5);
        playlistSongs = shuffled.slice(0, 20);
      }

      for (let i = 0; i < playlistSongs.length; i++) {
        insertPlaylistSong.run(playlistId, playlistSongs[i].id, i + 1);
      }
    }
  });

  transaction();
}

module.exports = db;
