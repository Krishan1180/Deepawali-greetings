// ─── MusicWave Application ─────────────────────────────────────
// A Spotify-inspired music streaming UI

(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  const state = {
    currentView: 'home',
    viewHistory: [],
    historyIndex: -1,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'off', // off, all, one
    volume: 0.7,
    currentTime: 0,
    duration: 0,
    simulationInterval: null,
    likedSongs: new Set(),
    playlists: [],
  };

  // ─── DOM References ─────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const contentArea = $('#contentArea');
  const searchBar = $('#searchBar');
  const searchInput = $('#searchInput');
  const nowPlaying = $('#nowPlaying');
  const npTitle = $('#npTitle');
  const npArtist = $('#npArtist');
  const npLikeBtn = $('#npLikeBtn');
  const playPauseBtn = $('#playPauseBtn');
  const playIcon = $('#playIcon');
  const pauseIcon = $('#pauseIcon');
  const prevBtn = $('#prevBtn');
  const nextBtn = $('#nextBtn');
  const shuffleBtn = $('#shuffleBtn');
  const repeatBtn = $('#repeatBtn');
  const progressBar = $('#progressBar');
  const progressFill = $('#progressFill');
  const timeCurrent = $('#timeCurrent');
  const timeTotal = $('#timeTotal');
  const volumeBar = $('#volumeBar');
  const volumeFill = $('#volumeFill');
  const volumeBtn = $('#volumeBtn');
  const backBtn = $('#backBtn');
  const forwardBtn = $('#forwardBtn');
  const queueBtn = $('#queueBtn');
  const queuePanel = $('#queuePanel');
  const queueContent = $('#queueContent');
  const closeQueueBtn = $('#closeQueueBtn');
  const createPlaylistBtn = $('#createPlaylistBtn');
  const createPlaylistModal = $('#createPlaylistModal');
  const playlistNameInput = $('#playlistNameInput');
  const playlistDescInput = $('#playlistDescInput');
  const cancelPlaylistBtn = $('#cancelPlaylistBtn');
  const savePlaylistBtn = $('#savePlaylistBtn');
  const libraryList = $('#libraryList');

  // ─── Utilities ──────────────────────────────────────────────
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function formatPlays(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function getGenreGradient(genre) {
    const map = {
      'Pop': 'gradient-pop',
      'Rock': 'gradient-rock',
      'Electronic': 'gradient-electronic',
      'R&B': 'gradient-rb',
      'Indie': 'gradient-indie',
      'Hip-Hop': 'gradient-hiphop',
      'Lo-Fi': 'gradient-lofi',
      'Classical': 'gradient-classical',
      'Metal': 'gradient-metal',
      'Jazz': 'gradient-jazz',
    };
    return map[genre] || 'gradient-pop';
  }

  function musicIcon(size = 40) {
    return `<svg viewBox="0 0 80 80" width="${size}" height="${size}"><rect width="80" height="80" rx="4" fill="#282828"/><path d="M52 22v24a8 8 0 11-4-6.93V28H36v20a8 8 0 11-4-6.93V22h20z" fill="#5e5e5e"/></svg>`;
  }

  function artistIcon(size = 40) {
    return `<svg viewBox="0 0 80 80" width="${size}" height="${size}"><circle cx="40" cy="40" r="40" fill="#282828"/><circle cx="40" cy="32" r="12" fill="#5e5e5e"/><ellipse cx="40" cy="60" rx="20" ry="14" fill="#5e5e5e"/></svg>`;
  }

  function playIconSvg() {
    return '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M8 5.14v13.72a1 1 0 001.5.86l11.24-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z" fill="currentColor"/></svg>';
  }

  // ─── API ────────────────────────────────────────────────────
  async function api(path) {
    const res = await fetch(`/api${path}`);
    return res.json();
  }

  async function apiPost(path, body = {}) {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function apiDelete(path) {
    const res = await fetch(`/api${path}`, { method: 'DELETE' });
    return res.json();
  }

  // ─── Navigation ─────────────────────────────────────────────
  function navigate(view, data = {}, addToHistory = true) {
    if (addToHistory) {
      state.viewHistory = state.viewHistory.slice(0, state.historyIndex + 1);
      state.viewHistory.push({ view, data });
      state.historyIndex = state.viewHistory.length - 1;
    }

    state.currentView = view;
    updateNavActive(view);
    updateNavButtons();

    switch (view) {
      case 'home': renderHome(); break;
      case 'search': renderSearch(); break;
      case 'artist': renderArtist(data.id); break;
      case 'album': renderAlbum(data.id); break;
      case 'playlist': renderPlaylist(data.id); break;
      case 'liked': renderLiked(); break;
      case 'genre': renderGenre(data.genre); break;
    }
  }

  function goBack() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      const entry = state.viewHistory[state.historyIndex];
      navigate(entry.view, entry.data, false);
    }
  }

  function goForward() {
    if (state.historyIndex < state.viewHistory.length - 1) {
      state.historyIndex++;
      const entry = state.viewHistory[state.historyIndex];
      navigate(entry.view, entry.data, false);
    }
  }

  function updateNavButtons() {
    backBtn.disabled = state.historyIndex <= 0;
    forwardBtn.disabled = state.historyIndex >= state.viewHistory.length - 1;
  }

  function updateNavActive(view) {
    $$('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    if (view === 'search') {
      searchBar.classList.remove('hidden');
      searchInput.focus();
    } else {
      searchBar.classList.add('hidden');
    }
  }

  // ─── Render: Home ───────────────────────────────────────────
  async function renderHome() {
    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const data = await api('/home');

    let html = `<h2 class="greeting">${getGreeting()}</h2>`;

    // Quick play cards (recently played or top songs)
    if (data.recentlyPlayed.length > 0) {
      html += '<div class="quick-grid">';
      data.recentlyPlayed.forEach((s) => {
        html += `
          <div class="quick-card" data-song-id="${s.id}" data-action="play-song">
            <div class="quick-card-cover">${musicIcon(64)}</div>
            <span class="quick-card-name">${s.title}</span>
          </div>`;
      });
      html += '</div>';
    }

    // Featured Playlists
    if (data.featuredPlaylists.length > 0) {
      html += `
        <div class="section">
          <div class="section-header">
            <h3 class="section-title">Featured Playlists</h3>
          </div>
          <div class="card-grid">`;
      data.featuredPlaylists.forEach((pl) => {
        html += renderCard({
          id: pl.id,
          type: 'playlist',
          title: pl.name,
          subtitle: pl.description || `${pl.song_count} songs`,
          icon: musicIcon(80),
        });
      });
      html += '</div></div>';
    }

    // Top Artists
    if (data.topArtists.length > 0) {
      html += `
        <div class="section">
          <div class="section-header">
            <h3 class="section-title">Popular Artists</h3>
          </div>
          <div class="card-grid">`;
      data.topArtists.forEach((a) => {
        html += renderCard({
          id: a.id,
          type: 'artist',
          title: a.name,
          subtitle: 'Artist',
          icon: artistIcon(80),
          round: true,
        });
      });
      html += '</div></div>';
    }

    // New Releases
    if (data.newReleases.length > 0) {
      html += `
        <div class="section">
          <div class="section-header">
            <h3 class="section-title">New Releases</h3>
          </div>
          <div class="card-grid">`;
      data.newReleases.forEach((al) => {
        html += renderCard({
          id: al.id,
          type: 'album',
          title: al.title,
          subtitle: `${al.artist_name} • ${al.release_year}`,
          icon: musicIcon(80),
        });
      });
      html += '</div></div>';
    }

    contentArea.innerHTML = html;
    attachCardListeners();
  }

  // ─── Render: Search ─────────────────────────────────────────
  async function renderSearch(query) {
    if (!query) {
      // Show genres
      const genres = await api('/genres');
      let html = `
        <div class="section">
          <h3 class="section-title" style="margin-bottom:16px">Browse All</h3>
          <div class="genre-grid">`;
      genres.forEach((g) => {
        html += `<div class="genre-card" data-genre="${g}">${g}</div>`;
      });
      html += '</div></div>';
      contentArea.innerHTML = html;

      $$('.genre-card').forEach((el) => {
        el.addEventListener('click', () => navigate('genre', { genre: el.dataset.genre }));
      });
      return;
    }

    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const data = await api(`/search?q=${encodeURIComponent(query)}`);
    let html = '';

    if (data.songs.length === 0 && data.artists.length === 0 && data.albums.length === 0 && data.playlists.length === 0) {
      html = `
        <div class="empty-state">
          <h3>No results found for "${query}"</h3>
          <p>Check your spelling or try different keywords.</p>
        </div>`;
      contentArea.innerHTML = html;
      return;
    }

    // Songs
    if (data.songs.length > 0) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:16px">Songs</h3>`;
      html += renderSongList(data.songs);
      html += '</div>';
    }

    // Artists
    if (data.artists.length > 0) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:16px">Artists</h3>
        <div class="card-grid">`;
      data.artists.forEach((a) => {
        html += renderCard({
          id: a.id, type: 'artist', title: a.name,
          subtitle: `${formatPlays(a.followers)} followers`,
          icon: artistIcon(80), round: true,
        });
      });
      html += '</div></div>';
    }

    // Albums
    if (data.albums.length > 0) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:16px">Albums</h3>
        <div class="card-grid">`;
      data.albums.forEach((al) => {
        html += renderCard({
          id: al.id, type: 'album', title: al.title,
          subtitle: `${al.artist_name} • ${al.release_year}`,
          icon: musicIcon(80),
        });
      });
      html += '</div></div>';
    }

    // Playlists
    if (data.playlists.length > 0) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:16px">Playlists</h3>
        <div class="card-grid">`;
      data.playlists.forEach((pl) => {
        html += renderCard({
          id: pl.id, type: 'playlist', title: pl.name,
          subtitle: pl.description || 'Playlist',
          icon: musicIcon(80),
        });
      });
      html += '</div></div>';
    }

    contentArea.innerHTML = html;
    attachCardListeners();
    attachSongListeners();
  }

  // ─── Render: Artist ─────────────────────────────────────────
  async function renderArtist(id) {
    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const artist = await api(`/artists/${id}`);
    const gradient = getGenreGradient(artist.genre);

    let html = `<div class="${gradient}" style="margin:-24px -24px 0;padding:24px 24px 0;border-radius:8px 8px 0 0">
      <div class="detail-header">
        <div class="detail-cover round">${artistIcon(232)}</div>
        <div class="detail-info">
          <span class="detail-type">Artist</span>
          <h1 class="detail-title">${artist.name}</h1>
          <div class="detail-meta">${formatPlays(artist.followers)} followers • ${artist.genre}</div>
        </div>
      </div>
    </div>`;

    // Play button and top songs
    html += `<div class="detail-actions">
      <button class="play-btn-large" data-action="play-artist" data-id="${id}">${playIconSvg()}</button>
    </div>`;

    if (artist.topSongs.length > 0) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:16px">Popular</h3>`;
      html += renderSongList(artist.topSongs.map((s) => ({
        ...s, artist_name: artist.name,
      })), false);
      html += '</div>';
    }

    if (artist.albums.length > 0) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:16px">Discography</h3>
        <div class="card-grid">`;
      artist.albums.forEach((al) => {
        html += renderCard({
          id: al.id, type: 'album', title: al.title,
          subtitle: `${al.release_year} • ${al.song_count} songs`,
          icon: musicIcon(80),
        });
      });
      html += '</div></div>';
    }

    if (artist.bio) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:12px">About</h3>
        <p style="color:var(--text-secondary);max-width:600px;line-height:1.6">${artist.bio}</p>
      </div>`;
    }

    contentArea.innerHTML = html;
    attachCardListeners();
    attachSongListeners();

    // Play all artist songs
    const playArtistBtn = contentArea.querySelector('[data-action="play-artist"]');
    if (playArtistBtn) {
      playArtistBtn.addEventListener('click', () => {
        const allSongs = artist.topSongs.map((s) => ({ ...s, artist_name: artist.name }));
        playSongList(allSongs, 0);
      });
    }
  }

  // ─── Render: Album ──────────────────────────────────────────
  async function renderAlbum(id) {
    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const album = await api(`/albums/${id}`);
    const gradient = getGenreGradient(album.genre);
    const totalDuration = album.songs.reduce((sum, s) => sum + s.duration, 0);

    let html = `<div class="${gradient}" style="margin:-24px -24px 0;padding:24px 24px 0;border-radius:8px 8px 0 0">
      <div class="detail-header">
        <div class="detail-cover">${musicIcon(232)}</div>
        <div class="detail-info">
          <span class="detail-type">Album</span>
          <h1 class="detail-title">${album.title}</h1>
          <div class="detail-meta">
            <strong class="clickable" data-action="go-artist" data-id="${album.artist_id}">${album.artist_name}</strong>
            • ${album.release_year} • ${album.songs.length} songs, ${formatTime(totalDuration)}
          </div>
        </div>
      </div>
    </div>`;

    html += `<div class="detail-actions">
      <button class="play-btn-large" data-action="play-album" data-id="${id}">${playIconSvg()}</button>
    </div>`;

    html += renderSongList(album.songs);

    contentArea.innerHTML = html;
    attachSongListeners();

    // Click artist name
    contentArea.querySelectorAll('[data-action="go-artist"]').forEach((el) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => navigate('artist', { id: el.dataset.id }));
    });

    // Play all
    const playAlbumBtn = contentArea.querySelector('[data-action="play-album"]');
    if (playAlbumBtn) {
      playAlbumBtn.addEventListener('click', () => {
        playSongList(album.songs, 0);
      });
    }
  }

  // ─── Render: Playlist ───────────────────────────────────────
  async function renderPlaylist(id) {
    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const playlist = await api(`/playlists/${id}`);
    const totalDuration = playlist.songs.reduce((sum, s) => sum + s.duration, 0);

    let html = `<div class="gradient-playlist" style="margin:-24px -24px 0;padding:24px 24px 0;border-radius:8px 8px 0 0">
      <div class="detail-header">
        <div class="detail-cover">${musicIcon(232)}</div>
        <div class="detail-info">
          <span class="detail-type">Playlist</span>
          <h1 class="detail-title">${playlist.name}</h1>
          ${playlist.description ? `<p style="color:var(--text-secondary);margin-top:4px">${playlist.description}</p>` : ''}
          <div class="detail-meta">${playlist.songs.length} songs, ${formatTime(totalDuration)}</div>
        </div>
      </div>
    </div>`;

    html += `<div class="detail-actions">
      <button class="play-btn-large" data-action="play-playlist" data-id="${id}">${playIconSvg()}</button>
    </div>`;

    if (playlist.songs.length > 0) {
      html += renderSongList(playlist.songs);
    } else {
      html += `<div class="empty-state">
        <h3>This playlist is empty</h3>
        <p>Find songs to add to this playlist.</p>
      </div>`;
    }

    contentArea.innerHTML = html;
    attachSongListeners();

    const playPlaylistBtn = contentArea.querySelector('[data-action="play-playlist"]');
    if (playPlaylistBtn) {
      playPlaylistBtn.addEventListener('click', () => {
        playSongList(playlist.songs, 0);
      });
    }
  }

  // ─── Render: Liked Songs ────────────────────────────────────
  async function renderLiked() {
    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const songs = await api('/liked');

    let html = `<div class="gradient-liked" style="margin:-24px -24px 0;padding:24px 24px 0;border-radius:8px 8px 0 0">
      <div class="detail-header">
        <div class="detail-cover" style="background:linear-gradient(135deg,#450af5,#c4efd9)">
          <svg viewBox="0 0 24 24" width="80" height="80" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
        <div class="detail-info">
          <span class="detail-type">Playlist</span>
          <h1 class="detail-title">Liked Songs</h1>
          <div class="detail-meta">${songs.length} songs</div>
        </div>
      </div>
    </div>`;

    html += `<div class="detail-actions">
      <button class="play-btn-large" data-action="play-liked">${playIconSvg()}</button>
    </div>`;

    if (songs.length > 0) {
      html += renderSongList(songs);
    } else {
      html += `<div class="empty-state">
        <h3>Songs you like will appear here</h3>
        <p>Save songs by tapping the heart icon.</p>
      </div>`;
    }

    contentArea.innerHTML = html;
    attachSongListeners();

    const playLikedBtn = contentArea.querySelector('[data-action="play-liked"]');
    if (playLikedBtn) {
      playLikedBtn.addEventListener('click', () => {
        playSongList(songs, 0);
      });
    }
  }

  // ─── Render: Genre ──────────────────────────────────────────
  async function renderGenre(genre) {
    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    const data = await api(`/genres/${encodeURIComponent(genre)}`);
    const gradient = getGenreGradient(genre);

    let html = `<div class="${gradient}" style="margin:-24px -24px 0;padding:40px 24px 24px;border-radius:8px 8px 0 0">
      <h1 class="detail-title">${genre}</h1>
    </div>`;

    if (data.songs.length > 0) {
      html += `<div class="section" style="margin-top:24px">
        <h3 class="section-title" style="margin-bottom:16px">Popular ${genre} Songs</h3>`;
      html += renderSongList(data.songs);
      html += '</div>';
    }

    if (data.artists.length > 0) {
      html += `<div class="section">
        <h3 class="section-title" style="margin-bottom:16px">${genre} Artists</h3>
        <div class="card-grid">`;
      data.artists.forEach((a) => {
        html += renderCard({
          id: a.id, type: 'artist', title: a.name,
          subtitle: `${formatPlays(a.followers)} followers`,
          icon: artistIcon(80), round: true,
        });
      });
      html += '</div></div>';
    }

    contentArea.innerHTML = html;
    attachCardListeners();
    attachSongListeners();
  }

  // ─── Card Renderer ──────────────────────────────────────────
  function renderCard({ id, type, title, subtitle, icon, round = false }) {
    return `
      <div class="card" data-type="${type}" data-id="${id}">
        <div class="card-cover ${round ? 'round' : ''}">
          ${icon}
          <button class="card-play-btn" data-action="play-card" data-type="${type}" data-id="${id}">
            ${playIconSvg()}
          </button>
        </div>
        <div class="card-title">${title}</div>
        <div class="card-subtitle">${subtitle}</div>
      </div>`;
  }

  function attachCardListeners() {
    contentArea.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-play-btn')) return;
        const { type, id } = card.dataset;
        navigate(type, { id });
      });
    });

    contentArea.querySelectorAll('.card-play-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { type, id } = btn.dataset;
        if (type === 'playlist') {
          const pl = await api(`/playlists/${id}`);
          playSongList(pl.songs, 0);
        } else if (type === 'album') {
          const al = await api(`/albums/${id}`);
          playSongList(al.songs, 0);
        } else if (type === 'artist') {
          const ar = await api(`/artists/${id}`);
          playSongList(ar.topSongs.map((s) => ({ ...s, artist_name: ar.name })), 0);
        }
      });
    });
  }

  // ─── Song List Renderer ─────────────────────────────────────
  function renderSongList(songs, showAlbum = true) {
    let html = '<div class="song-list">';
    html += `<div class="song-list-header">
      <span>#</span>
      <span>Title</span>
      ${showAlbum ? '<span>Album</span>' : ''}
      <span style="text-align:right">Duration</span>
    </div>`;

    songs.forEach((s, i) => {
      const isActive = state.queue[state.queueIndex]?.id === s.id;
      html += `
        <div class="song-row ${isActive ? 'active' : ''}" data-song-id="${s.id}" data-index="${i}">
          <div class="song-num-col">
            <span class="song-num">${isActive ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)"><rect x="2" y="2" width="5" height="20" rx="1"/><rect x="10" y="6" width="5" height="16" rx="1"/><rect x="18" y="10" width="5" height="12" rx="1"/></svg>' : (i + 1)}</span>
            <span class="song-play-icon">${playIconSvg()}</span>
          </div>
          <div class="song-info">
            <div class="song-thumb">${musicIcon(40)}</div>
            <div class="song-details">
              <span class="song-name">${s.title}</span>
              <span class="song-artist-name" data-artist-id="${s.artist_id}">${s.artist_name}</span>
            </div>
          </div>
          ${showAlbum ? `<span class="song-album-col" data-album-id="${s.album_id}">${s.album_title || ''}</span>` : ''}
          <div class="song-actions">
            <button class="btn-icon song-like-btn ${state.likedSongs.has(s.id) ? 'liked' : ''}" data-song-id="${s.id}" title="Like">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
            <span class="song-duration">${formatTime(s.duration)}</span>
          </div>
        </div>`;
    });

    html += '</div>';
    return html;
  }

  function attachSongListeners() {
    contentArea.querySelectorAll('.song-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.song-like-btn') || e.target.closest('.song-artist-name') || e.target.closest('.song-album-col')) return;
        const songRows = contentArea.querySelectorAll('.song-row');
        const songs = Array.from(songRows).map((r) => ({
          id: r.dataset.songId,
          title: r.querySelector('.song-name').textContent,
          artist_name: r.querySelector('.song-artist-name').textContent,
          artist_id: r.querySelector('.song-artist-name').dataset.artistId,
          album_title: r.querySelector('.song-album-col')?.textContent || '',
          album_id: r.querySelector('.song-album-col')?.dataset.albumId || '',
          duration: parseTimeToSeconds(r.querySelector('.song-duration').textContent),
        }));
        const idx = parseInt(row.dataset.index);
        playSongList(songs, idx);
      });

      // Like button
      row.querySelectorAll('.song-like-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const songId = btn.dataset.songId;
          const res = await apiPost(`/liked/${songId}`);
          if (res.liked) {
            state.likedSongs.add(songId);
            btn.classList.add('liked');
          } else {
            state.likedSongs.delete(songId);
            btn.classList.remove('liked');
          }
          updateNowPlayingLike();
        });
      });

      // Navigate to artist
      row.querySelectorAll('.song-artist-name').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (el.dataset.artistId) navigate('artist', { id: el.dataset.artistId });
        });
      });

      // Navigate to album
      row.querySelectorAll('.song-album-col').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (el.dataset.albumId) navigate('album', { id: el.dataset.albumId });
        });
      });
    });

    // Quick play cards
    contentArea.querySelectorAll('[data-action="play-song"]').forEach((el) => {
      el.addEventListener('click', async () => {
        const songId = el.dataset.songId;
        const song = await api(`/songs/${songId}`);
        playSongList([song], 0);
      });
    });
  }

  function parseTimeToSeconds(str) {
    const parts = str.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  // ─── Player ─────────────────────────────────────────────────
  function playSongList(songs, index) {
    state.queue = songs;
    state.queueIndex = index;
    playCurrent();
  }

  function playCurrent() {
    if (state.queueIndex < 0 || state.queueIndex >= state.queue.length) return;

    const song = state.queue[state.queueIndex];
    state.isPlaying = true;
    state.currentTime = 0;
    state.duration = song.duration || 240;

    // Update now playing bar
    nowPlaying.classList.remove('hidden');
    npTitle.textContent = song.title;
    npArtist.textContent = song.artist_name;
    timeTotal.textContent = formatTime(state.duration);
    timeCurrent.textContent = '0:00';
    progressFill.style.width = '0%';

    updatePlayPauseIcon();
    updateNowPlayingLike();
    highlightActiveSong();
    updateQueuePanel();

    // Record play
    apiPost(`/play/${song.id}`);

    // Start simulation
    startSimulation();
  }

  function startSimulation() {
    clearInterval(state.simulationInterval);
    state.simulationInterval = setInterval(() => {
      if (!state.isPlaying) return;
      state.currentTime += 0.5;
      if (state.currentTime >= state.duration) {
        handleSongEnd();
        return;
      }
      updateProgress();
    }, 500);
  }

  function handleSongEnd() {
    if (state.repeatMode === 'one') {
      state.currentTime = 0;
      return;
    }

    if (state.queueIndex < state.queue.length - 1) {
      state.queueIndex++;
      playCurrent();
    } else if (state.repeatMode === 'all') {
      state.queueIndex = 0;
      playCurrent();
    } else {
      state.isPlaying = false;
      updatePlayPauseIcon();
      clearInterval(state.simulationInterval);
    }
  }

  function togglePlay() {
    if (state.queue.length === 0) return;
    state.isPlaying = !state.isPlaying;
    updatePlayPauseIcon();
    if (state.isPlaying) startSimulation();
  }

  function playNext() {
    if (state.isShuffle) {
      state.queueIndex = Math.floor(Math.random() * state.queue.length);
    } else if (state.queueIndex < state.queue.length - 1) {
      state.queueIndex++;
    } else if (state.repeatMode === 'all') {
      state.queueIndex = 0;
    } else {
      return;
    }
    playCurrent();
  }

  function playPrev() {
    if (state.currentTime > 3) {
      state.currentTime = 0;
      updateProgress();
      return;
    }
    if (state.queueIndex > 0) {
      state.queueIndex--;
      playCurrent();
    }
  }

  function updateProgress() {
    const pct = (state.currentTime / state.duration) * 100;
    progressFill.style.width = pct + '%';
    timeCurrent.textContent = formatTime(state.currentTime);
  }

  function updatePlayPauseIcon() {
    playIcon.classList.toggle('hidden', state.isPlaying);
    pauseIcon.classList.toggle('hidden', !state.isPlaying);
  }

  function updateNowPlayingLike() {
    const song = state.queue[state.queueIndex];
    if (!song) return;
    npLikeBtn.classList.toggle('liked', state.likedSongs.has(song.id));
  }

  function highlightActiveSong() {
    $$('.song-row').forEach((row) => {
      row.classList.toggle('active', row.dataset.songId === state.queue[state.queueIndex]?.id);
    });
  }

  function updateQueuePanel() {
    if (queuePanel.classList.contains('hidden')) return;
    let html = '';
    if (state.queue.length === 0) {
      html = '<div class="empty-state"><p>Queue is empty</p></div>';
    } else {
      state.queue.forEach((s, i) => {
        html += `
          <div class="queue-item ${i === state.queueIndex ? 'active' : ''}" data-index="${i}">
            <span class="queue-item-num">${i + 1}</span>
            <div class="queue-item-info">
              <span class="queue-item-title">${s.title}</span>
              <span class="queue-item-artist">${s.artist_name}</span>
            </div>
          </div>`;
      });
    }
    queueContent.innerHTML = html;

    queueContent.querySelectorAll('.queue-item').forEach((item) => {
      item.addEventListener('click', () => {
        state.queueIndex = parseInt(item.dataset.index);
        playCurrent();
      });
    });
  }

  // ─── Library Sidebar ────────────────────────────────────────
  async function loadLibrary() {
    const playlists = await api('/playlists');
    state.playlists = playlists;

    // Clear all except liked songs
    const items = libraryList.querySelectorAll('.library-item:not([data-view="liked"])');
    items.forEach((el) => el.remove());

    playlists.forEach((pl) => {
      const div = document.createElement('div');
      div.className = 'library-item';
      div.dataset.view = 'playlist';
      div.dataset.id = pl.id;
      div.innerHTML = `
        <div class="library-item-cover">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
        </div>
        <div class="library-item-info">
          <span class="library-item-name">${pl.name}</span>
          <span class="library-item-meta">Playlist • ${pl.song_count} songs</span>
        </div>`;
      div.addEventListener('click', () => navigate('playlist', { id: pl.id }));
      libraryList.appendChild(div);
    });
  }

  async function loadLikedSongs() {
    const songs = await api('/liked');
    state.likedSongs = new Set(songs.map((s) => s.song_id || s.id));
  }

  // ─── Event Listeners ───────────────────────────────────────
  function initEvents() {
    // Navigation
    $$('.nav-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(el.dataset.view);
      });
    });

    // Liked songs in sidebar
    libraryList.querySelector('[data-view="liked"]').addEventListener('click', () => {
      navigate('liked');
    });

    backBtn.addEventListener('click', goBack);
    forwardBtn.addEventListener('click', goForward);

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderSearch(searchInput.value.trim());
      }, 300);
    });

    // Player controls
    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);

    shuffleBtn.addEventListener('click', () => {
      state.isShuffle = !state.isShuffle;
      shuffleBtn.classList.toggle('active', state.isShuffle);
    });

    repeatBtn.addEventListener('click', () => {
      const modes = ['off', 'all', 'one'];
      const idx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      state.repeatMode = modes[idx];
      repeatBtn.classList.toggle('active', state.repeatMode !== 'off');
      repeatBtn.title = state.repeatMode === 'one' ? 'Repeat One' : state.repeatMode === 'all' ? 'Repeat All' : 'Repeat';
    });

    // Progress bar click
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      state.currentTime = pct * state.duration;
      updateProgress();
    });

    // Volume
    volumeFill.style.width = (state.volume * 100) + '%';
    volumeBar.addEventListener('click', (e) => {
      const rect = volumeBar.getBoundingClientRect();
      state.volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      volumeFill.style.width = (state.volume * 100) + '%';
    });

    volumeBtn.addEventListener('click', () => {
      if (state.volume > 0) {
        state._prevVolume = state.volume;
        state.volume = 0;
      } else {
        state.volume = state._prevVolume || 0.7;
      }
      volumeFill.style.width = (state.volume * 100) + '%';
    });

    // Now playing like
    npLikeBtn.addEventListener('click', async () => {
      const song = state.queue[state.queueIndex];
      if (!song) return;
      const res = await apiPost(`/liked/${song.id}`);
      if (res.liked) {
        state.likedSongs.add(song.id);
      } else {
        state.likedSongs.delete(song.id);
      }
      updateNowPlayingLike();
    });

    // Queue panel
    queueBtn.addEventListener('click', () => {
      queuePanel.classList.toggle('hidden');
      updateQueuePanel();
    });
    closeQueueBtn.addEventListener('click', () => {
      queuePanel.classList.add('hidden');
    });

    // Create playlist
    createPlaylistBtn.addEventListener('click', () => {
      createPlaylistModal.classList.remove('hidden');
      playlistNameInput.value = '';
      playlistDescInput.value = '';
      playlistNameInput.focus();
    });

    cancelPlaylistBtn.addEventListener('click', () => {
      createPlaylistModal.classList.add('hidden');
    });

    savePlaylistBtn.addEventListener('click', async () => {
      const name = playlistNameInput.value.trim();
      if (!name) return;
      await apiPost('/playlists', {
        name,
        description: playlistDescInput.value.trim(),
      });
      createPlaylistModal.classList.add('hidden');
      loadLibrary();
    });

    createPlaylistModal.addEventListener('click', (e) => {
      if (e.target === createPlaylistModal) {
        createPlaylistModal.classList.add('hidden');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (e.shiftKey) playNext();
          else { state.currentTime = Math.min(state.currentTime + 10, state.duration); updateProgress(); }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) playPrev();
          else { state.currentTime = Math.max(state.currentTime - 10, 0); updateProgress(); }
          break;
        case 'ArrowUp':
          e.preventDefault();
          state.volume = Math.min(1, state.volume + 0.1);
          volumeFill.style.width = (state.volume * 100) + '%';
          break;
        case 'ArrowDown':
          e.preventDefault();
          state.volume = Math.max(0, state.volume - 0.1);
          volumeFill.style.width = (state.volume * 100) + '%';
          break;
      }
    });
  }

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    await loadLikedSongs();
    await loadLibrary();
    initEvents();
    navigate('home');
  }

  init();
})();
