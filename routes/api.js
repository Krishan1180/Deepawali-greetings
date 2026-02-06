const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ─── Browse / Home ───────────────────────────────────────────────

router.get('/home', (req, res) => {
  const featuredPlaylists = db.prepare(`
    SELECT p.*, COUNT(ps.song_id) as song_count
    FROM playlists p
    LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
    GROUP BY p.id
    ORDER BY RANDOM()
    LIMIT 8
  `).all();

  const recentlyPlayed = db.prepare(`
    SELECT s.*, a.name as artist_name, al.title as album_title, al.cover as album_cover
    FROM recently_played rp
    JOIN songs s ON rp.song_id = s.id
    JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    ORDER BY rp.played_at DESC
    LIMIT 6
  `).all();

  const topArtists = db.prepare(`
    SELECT * FROM artists ORDER BY followers DESC LIMIT 8
  `).all();

  const newReleases = db.prepare(`
    SELECT al.*, a.name as artist_name
    FROM albums al
    JOIN artists a ON al.artist_id = a.id
    ORDER BY al.release_year DESC
    LIMIT 8
  `).all();

  res.json({ featuredPlaylists, recentlyPlayed, topArtists, newReleases });
});

// ─── Search ──────────────────────────────────────────────────────

router.get('/search', (req, res) => {
  const q = req.query.q;
  if (!q || q.trim().length === 0) {
    return res.json({ songs: [], artists: [], albums: [], playlists: [] });
  }
  const pattern = `%${q}%`;

  const songs = db.prepare(`
    SELECT s.*, a.name as artist_name, al.title as album_title
    FROM songs s
    JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    WHERE s.title LIKE ?
    LIMIT 10
  `).all(pattern);

  const artists = db.prepare(`
    SELECT * FROM artists WHERE name LIKE ? LIMIT 5
  `).all(pattern);

  const albums = db.prepare(`
    SELECT al.*, a.name as artist_name
    FROM albums al
    JOIN artists a ON al.artist_id = a.id
    WHERE al.title LIKE ?
    LIMIT 5
  `).all(pattern);

  const playlists = db.prepare(`
    SELECT * FROM playlists WHERE name LIKE ? LIMIT 5
  `).all(pattern);

  res.json({ songs, artists, albums, playlists });
});

// ─── Songs ───────────────────────────────────────────────────────

router.get('/songs', (req, res) => {
  const songs = db.prepare(`
    SELECT s.*, a.name as artist_name, al.title as album_title
    FROM songs s
    JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    ORDER BY s.plays DESC
    LIMIT 50
  `).all();
  res.json(songs);
});

router.get('/songs/:id', (req, res) => {
  const song = db.prepare(`
    SELECT s.*, a.name as artist_name, al.title as album_title, al.cover as album_cover
    FROM songs s
    JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(song);
});

// ─── Artists ─────────────────────────────────────────────────────

router.get('/artists', (req, res) => {
  const artists = db.prepare('SELECT * FROM artists ORDER BY followers DESC').all();
  res.json(artists);
});

router.get('/artists/:id', (req, res) => {
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(req.params.id);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });

  const albums = db.prepare(`
    SELECT al.*, COUNT(s.id) as song_count
    FROM albums al
    LEFT JOIN songs s ON al.id = s.album_id
    WHERE al.artist_id = ?
    GROUP BY al.id
    ORDER BY al.release_year DESC
  `).all(req.params.id);

  const topSongs = db.prepare(`
    SELECT s.*, al.title as album_title
    FROM songs s
    LEFT JOIN albums al ON s.album_id = al.id
    WHERE s.artist_id = ?
    ORDER BY s.plays DESC
    LIMIT 5
  `).all(req.params.id);

  res.json({ ...artist, albums, topSongs });
});

// ─── Albums ──────────────────────────────────────────────────────

router.get('/albums', (req, res) => {
  const albums = db.prepare(`
    SELECT al.*, a.name as artist_name, COUNT(s.id) as song_count
    FROM albums al
    JOIN artists a ON al.artist_id = a.id
    LEFT JOIN songs s ON al.id = s.album_id
    GROUP BY al.id
    ORDER BY al.release_year DESC
  `).all();
  res.json(albums);
});

router.get('/albums/:id', (req, res) => {
  const album = db.prepare(`
    SELECT al.*, a.name as artist_name
    FROM albums al
    JOIN artists a ON al.artist_id = a.id
    WHERE al.id = ?
  `).get(req.params.id);

  if (!album) return res.status(404).json({ error: 'Album not found' });

  const songs = db.prepare(`
    SELECT s.*, a.name as artist_name
    FROM songs s
    JOIN artists a ON s.artist_id = a.id
    WHERE s.album_id = ?
    ORDER BY s.track_number
  `).all(req.params.id);

  res.json({ ...album, songs });
});

// ─── Playlists ───────────────────────────────────────────────────

router.get('/playlists', (req, res) => {
  const playlists = db.prepare(`
    SELECT p.*, COUNT(ps.song_id) as song_count
    FROM playlists p
    LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(playlists);
});

router.get('/playlists/:id', (req, res) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const songs = db.prepare(`
    SELECT s.*, a.name as artist_name, al.title as album_title, ps.position
    FROM playlist_songs ps
    JOIN songs s ON ps.song_id = s.id
    JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    WHERE ps.playlist_id = ?
    ORDER BY ps.position
  `).all(req.params.id);

  res.json({ ...playlist, songs });
});

router.post('/playlists', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  db.prepare('INSERT INTO playlists (id, name, description) VALUES (?, ?, ?)').run(id, name, description || '');
  res.json({ id, name, description });
});

router.post('/playlists/:id/songs', (req, res) => {
  const { songId } = req.body;
  if (!songId) return res.status(400).json({ error: 'songId is required' });

  const existing = db.prepare('SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').get(req.params.id, songId);
  if (existing) return res.status(409).json({ error: 'Song already in playlist' });

  const maxPos = db.prepare('SELECT MAX(position) as max FROM playlist_songs WHERE playlist_id = ?').get(req.params.id);
  const position = (maxPos.max || 0) + 1;

  db.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(req.params.id, songId, position);
  res.json({ success: true });
});

router.delete('/playlists/:id/songs/:songId', (req, res) => {
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(req.params.id, req.params.songId);
  res.json({ success: true });
});

// ─── Liked Songs ─────────────────────────────────────────────────

router.get('/liked', (req, res) => {
  const songs = db.prepare(`
    SELECT s.*, a.name as artist_name, al.title as album_title, ls.liked_at
    FROM liked_songs ls
    JOIN songs s ON ls.song_id = s.id
    JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    ORDER BY ls.liked_at DESC
  `).all();
  res.json(songs);
});

router.post('/liked/:songId', (req, res) => {
  const existing = db.prepare('SELECT * FROM liked_songs WHERE song_id = ?').get(req.params.songId);
  if (existing) {
    db.prepare('DELETE FROM liked_songs WHERE song_id = ?').run(req.params.songId);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO liked_songs (song_id) VALUES (?)').run(req.params.songId);
  res.json({ liked: true });
});

router.get('/liked/check/:songId', (req, res) => {
  const existing = db.prepare('SELECT * FROM liked_songs WHERE song_id = ?').get(req.params.songId);
  res.json({ liked: !!existing });
});

// ─── Recently Played ─────────────────────────────────────────────

router.post('/play/:songId', (req, res) => {
  db.prepare('UPDATE songs SET plays = plays + 1 WHERE id = ?').run(req.params.songId);
  db.prepare('INSERT INTO recently_played (song_id) VALUES (?)').run(req.params.songId);

  // Keep only last 50 entries
  db.prepare(`
    DELETE FROM recently_played WHERE id NOT IN (
      SELECT id FROM recently_played ORDER BY played_at DESC LIMIT 50
    )
  `).run();

  res.json({ success: true });
});

// ─── Genres ──────────────────────────────────────────────────────

router.get('/genres', (req, res) => {
  const genres = db.prepare('SELECT DISTINCT genre FROM artists WHERE genre IS NOT NULL ORDER BY genre').all();
  res.json(genres.map(g => g.genre));
});

router.get('/genres/:genre', (req, res) => {
  const artists = db.prepare('SELECT * FROM artists WHERE genre = ?').all(req.params.genre);
  const songs = db.prepare(`
    SELECT s.*, a.name as artist_name, al.title as album_title
    FROM songs s
    JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    WHERE a.genre = ?
    ORDER BY s.plays DESC
    LIMIT 20
  `).all(req.params.genre);
  res.json({ genre: req.params.genre, artists, songs });
});

module.exports = router;
