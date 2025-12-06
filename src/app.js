import { YT_API_KEY, CYPRUS_TIMEZONE } from './config.js';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

const channelInput = document.getElementById('channelInput');
const loadButton = document.getElementById('loadButton');
const favoriteButton = document.getElementById('favoriteButton');
const clearFavoritesButton = document.getElementById('clearFavorites');
const favoritesListEl = document.getElementById('favoritesList');
const channelStatusEl = document.getElementById('channelStatus');
const videoGrid = document.getElementById('videoGrid');
const selectionInfo = document.getElementById('selectionInfo');
const analyzeButton = document.getElementById('analyzeButton');
const selectAllCheckbox = document.getElementById('selectAll');
const loadMoreButton = document.getElementById('loadMoreButton');
const analysisSection = document.getElementById('analysisSection');
const analysisBody = document.getElementById('analysisBody');
const downloadCsvButton = document.getElementById('downloadCsv');
const toast = document.getElementById('toast');
const scrollTopButton = document.getElementById('scrollTop');

const state = {
  channelInputValue: '',
  currentChannel: null,
  videos: [],
  nextPageToken: null,
  selectedVideos: new Set(),
  analysisRows: [],
};

const FAVORITES_KEY = 'ytChannelFavorites';
const MAX_SELECTION = 50;

loadButton.addEventListener('click', event => {
  event.preventDefault();
  const value = channelInput.value.trim();
  if (!value) {
    showToast('Введіть посилання на канал');
    return;
  }
  state.channelInputValue = value;
  loadChannelVideos({ append: false });
});

favoriteButton.addEventListener('click', () => {
  if (!state.currentChannel) return;
  const favorites = getFavorites();
  if (favorites.some(item => item.id === state.currentChannel.id)) {
    showToast('Канал вже в обраних');
    return;
  }
  favorites.push(state.currentChannel);
  saveFavorites(favorites);
  renderFavorites();
  showToast('Канал додано в обрані');
});

clearFavoritesButton.addEventListener('click', () => {
  localStorage.removeItem(FAVORITES_KEY);
  renderFavorites();
});

loadMoreButton.addEventListener('click', event => {
  event.preventDefault();
  if (!state.currentChannel || !state.nextPageToken) {
    showToast('Немає більше сторінок');
    return;
  }
  loadChannelVideos({ append: true });
});

analyzeButton.addEventListener('click', () => analyzeSelection());
downloadCsvButton.addEventListener('click', () => downloadCsv());
selectAllCheckbox.addEventListener('change', handleSelectAllChange);
scrollTopButton.addEventListener('click', scrollToTop);
window.addEventListener('scroll', handleScrollTopVisibility);

renderFavorites();
updateSelectionInfo();
syncSelectAllCheckbox();
handleScrollTopVisibility();

async function loadChannelVideos({ append }) {
  const isAppending = Boolean(append);
  try {
    if (!isAppending) {
      setVideoGridLoading();
    } else {
      loadMoreButton.textContent = 'Завантаження...';
    }
    toggleChannelControls(true);

    const channelReference = isAppending ? state.currentChannel?.url : state.channelInputValue;
    const existingId = isAppending ? state.currentChannel?.id : undefined;

    if (!channelReference) {
      showToast('Спочатку введіть посилання на канал');
      if (!isAppending) {
        resetVideoGrid();
      }
      return;
    }

    const data = await fetchChannelVideos({
      channelInput: channelReference,
      channelId: existingId,
      pageToken: isAppending ? state.nextPageToken : undefined,
    });

    state.currentChannel = data.channel;
    state.channelInputValue = data.channel.url;
    favoriteButton.disabled = false;
    channelStatusEl.textContent = `Канал: ${data.channel.title}`;

    if (!isAppending) {
      state.videos = [];
      state.selectedVideos.clear();
      updateSelectionInfo();
      hideAnalysis();
    }

    const newVideos = data.videos || [];
    state.videos = isAppending ? [...state.videos, ...newVideos] : newVideos;
    state.nextPageToken = data.nextPageToken;

    renderVideoGrid({
      append: isAppending,
      subset: isAppending ? newVideos : state.videos,
    });

    syncSelectAllCheckbox();
    loadMoreButton.classList.toggle('hidden', !state.nextPageToken);
    analyzeButton.disabled = state.selectedVideos.size === 0;
  } catch (error) {
    console.error(error);
    showToast(error.message);
    if (!isAppending) {
      resetVideoGrid();
    }
  } finally {
    loadMoreButton.textContent = 'Завантажити ще';
    toggleChannelControls(false);
  }
}

function renderVideoGrid({ append = false, subset = [] } = {}) {
  if (!state.videos.length) {
    resetVideoGrid();
    return;
  }

  videoGrid.classList.remove('empty-state');

  if (!append || !subset.length) {
    videoGrid.innerHTML = '';
    subset = state.videos;
  }

  subset.forEach(video => {
    videoGrid.appendChild(createVideoCard(video));
  });
}

function createVideoCard(video) {
  const card = document.createElement('article');
  card.className = 'video-card';

  const checkboxWrap = document.createElement('div');
  checkboxWrap.className = 'video-select';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = state.selectedVideos.has(video.videoId);
  checkbox.addEventListener('change', event => handleSelectionChange(video.videoId, event.target.checked));
  checkboxWrap.appendChild(checkbox);

  const thumbnail = document.createElement('img');
  thumbnail.src = video.thumbnail || 'https://via.placeholder.com/320x180?text=No+Image';
  thumbnail.alt = video.title;

  const body = document.createElement('div');
  body.className = 'video-body';

  const title = document.createElement('h4');
  title.textContent = video.title;

  const description = document.createElement('p');
  description.textContent = video.description;

  const meta = document.createElement('div');
  meta.className = 'video-meta';

  const metaLeft = document.createElement('div');
  metaLeft.className = 'video-meta-left';

  const dateSpan = document.createElement('span');
  dateSpan.textContent = formatDateTime(video.publishedAt);
  metaLeft.appendChild(dateSpan);

  const viewsLabel = formatCompactNumber(video.viewCount);
  if (viewsLabel) {
    const viewsSpan = document.createElement('span');
    viewsSpan.className = 'video-views';
    viewsSpan.textContent = `${viewsLabel} переглядів`;
    metaLeft.appendChild(viewsSpan);
  }

  const selectionSpan = document.createElement('span');
  selectionSpan.textContent = state.selectedVideos.has(video.videoId) ? '✓ Обрано' : '';

  meta.append(metaLeft, selectionSpan);

  body.append(title, description, meta);
  card.append(checkboxWrap, thumbnail, body);
  return card;
}

function resetVideoGrid() {
  videoGrid.classList.add('empty-state');
  videoGrid.innerHTML = '<p>Почніть з додавання посилання на канал</p>';
  loadMoreButton.classList.add('hidden');
  syncSelectAllCheckbox();
}

function setVideoGridLoading() {
  videoGrid.classList.add('empty-state');
  videoGrid.innerHTML = '<p>Завантаження...</p>';
  selectAllCheckbox.checked = false;
  selectAllCheckbox.indeterminate = false;
  selectAllCheckbox.disabled = true;
}

function handleSelectionChange(videoId, isSelected) {
  if (isSelected && state.selectedVideos.size >= MAX_SELECTION) {
    showToast('Можна вибрати максимум 50 відео');
    renderVideoGrid();
    return;
  }

  if (isSelected) {
    state.selectedVideos.add(videoId);
  } else {
    state.selectedVideos.delete(videoId);
  }

  analyzeButton.disabled = state.selectedVideos.size === 0;
  updateSelectionInfo();
  renderVideoGrid();
  syncSelectAllCheckbox();
}

function updateSelectionInfo() {
  selectionInfo.textContent = `${state.selectedVideos.size} / ${MAX_SELECTION} вибрано`;
}

async function analyzeSelection() {
  if (state.selectedVideos.size === 0) {
    showToast('Виберіть хоча б одне відео');
    return;
  }

  const videoIds = Array.from(state.selectedVideos);

  analyzeButton.disabled = true;
  analyzeButton.textContent = 'Аналіз...';

  try {
    const data = await fetchAnalysisData(videoIds);
    if (!data.length) {
      throw new Error('Не вдалося отримати дані відео');
    }

    state.analysisRows = data;
    renderAnalysisTable();
    analysisSection.classList.remove('hidden');
    downloadCsvButton.disabled = state.analysisRows.length === 0;
    showToast('Аналіз завершено');
  } catch (error) {
    console.error(error);
    showToast(error.message);
  } finally {
    analyzeButton.disabled = state.selectedVideos.size === 0;
    analyzeButton.textContent = 'Analyze';
  }
}

function renderAnalysisTable() {
  if (!state.analysisRows.length) {
    analysisBody.innerHTML = '<tr><td colspan="7">Немає даних</td></tr>';
    return;
  }

  const rows = state.analysisRows
    .map(
      item => `
      <tr>
        <td><img src="${item.thumbnail || 'https://via.placeholder.com/140x80?text=No+Image'}" alt="${escapeHtml(
          item.title
        )}" /></td>
        <td>
          <div class="analysis-row-title">${escapeHtml(item.title)}</div>
          <small>https://youtu.be/${item.videoId}</small>
        </td>
        <td>${escapeHtml(item.description || '')}</td>
        <td>${escapeHtml(item.tags || '—')}</td>
        <td>${escapeHtml(item.keywords || '—')}</td>
        <td>${item.viewCount || '0'}</td>
        <td>${item.publishedAt || 'N/A'}</td>
      </tr>`
    )
    .join('');

  analysisBody.innerHTML = rows;
}

function hideAnalysis() {
  state.analysisRows = [];
  analysisSection.classList.add('hidden');
  downloadCsvButton.disabled = true;
  analysisBody.innerHTML = '<tr><td colspan="7">Ще нема даних для відображення</td></tr>';
}

function downloadCsv() {
  if (!state.analysisRows.length) {
    showToast('Немає даних для експорту');
    return;
  }

  const headers = [
    'Preview',
    'Video URL',
    'Title',
    'Description',
    'Tags',
    'Keywords',
    'Views',
    'Publish Date (Cyprus)',
  ];

  const csv = [
    headers.join(','),
    ...state.analysisRows.map(item =>
      [
        item.thumbnail || '',
        `https://youtu.be/${item.videoId}`,
        item.title,
        item.description,
        item.tags,
        item.keywords,
        item.viewCount,
        item.publishedAt,
      ]
        .map(escapeCsvValue)
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `youtube-analysis-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function handleSelectAllChange() {
  if (selectAllCheckbox.disabled) {
    return;
  }

  if (selectAllCheckbox.checked) {
    const selectable = state.videos.slice(0, MAX_SELECTION).map(video => video.videoId);
    state.selectedVideos = new Set(selectable);
  } else {
    state.selectedVideos.clear();
  }

  analyzeButton.disabled = state.selectedVideos.size === 0;
  updateSelectionInfo();
  renderVideoGrid();
  syncSelectAllCheckbox();
}

function toggleChannelControls(disabled) {
  loadButton.disabled = disabled;
  favoriteButton.disabled = disabled || !state.currentChannel;
  loadMoreButton.disabled = disabled;
}

function renderFavorites() {
  const favorites = getFavorites();
  favoritesListEl.innerHTML =
    favorites.length === 0
      ? '<p class="favorites-hint">Немає збережених каналів</p>'
      : '';

  favorites.forEach(channel => {
    const chip = document.createElement('div');
    chip.className = 'favorite-item';

    const button = document.createElement('button');
    button.textContent = channel.title;
    button.addEventListener('click', () => {
      channelInput.value = channel.url;
      state.channelInputValue = channel.url;
      loadChannelVideos({ append: false });
    });

    const remove = document.createElement('button');
    remove.className = 'remove-favorite';
    remove.setAttribute('aria-label', 'Видалити канал');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      const updated = getFavorites().filter(item => item.id !== channel.id);
      saveFavorites(updated);
      renderFavorites();
    });

    chip.append(button, remove);
    favoritesListEl.appendChild(chip);
  });
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function escapeCsvValue(value = '') {
  const stringValue = String(value).replace(/\r?\n|\r/g, ' ');
  if (stringValue.includes(',') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  toast.classList.remove('hidden');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCompactNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }

  const formatValue = (divisor, suffix, fixedDigits = 1) => {
    let result = (numeric / divisor).toFixed(fixedDigits);
    result = result.replace(/\.0$/, '');
    return result.replace('.', ',') + suffix;
  };

  if (numeric >= 1_000_000) {
    return formatValue(1_000_000, 'M');
  }

  if (numeric >= 1_000) {
    const digits = numeric >= 100_000 ? 0 : 1;
    return formatValue(1_000, 'K', digits);
  }

  return numeric.toLocaleString('uk-UA');
}

function syncSelectAllCheckbox() {
  const totalSelectable = Math.min(MAX_SELECTION, state.videos.length);

  if (totalSelectable === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.disabled = true;
    return;
  }

  selectAllCheckbox.disabled = false;

  if (state.selectedVideos.size === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    return;
  }

  if (state.selectedVideos.size >= totalSelectable) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
    return;
  }

  selectAllCheckbox.checked = false;
  selectAllCheckbox.indeterminate = true;
}

function handleScrollTopVisibility() {
  const offset = window.pageYOffset || document.documentElement.scrollTop;
  scrollTopButton.classList.toggle('visible', offset > 320);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function fetchChannelVideos({ channelInput, channelId, pageToken }) {
  const resolvedId = channelId || (await resolveChannelId(channelInput));
  const channelResponse = await youtubeRequest('channels', {
    part: 'snippet,contentDetails',
    id: resolvedId,
    maxResults: 1,
  });

  const channelData = channelResponse.items?.[0];
  if (!channelData) {
    throw new Error('Канал не знайдено');
  }

  const uploadsPlaylistId = channelData.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error('Не вдалося отримати список відео каналу');
  }

  const playlistResponse = await youtubeRequest('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: 20,
    pageToken,
  });

  const videos = (playlistResponse.items || [])
    .map(item => {
      const snippet = item.snippet || {};
      const contentDetails = item.contentDetails || {};
      const videoId =
        contentDetails.videoId ||
        snippet.resourceId?.videoId ||
        snippet.videoOwnerChannelId;

      if (!videoId) {
        return null;
      }

      return {
        videoId,
        title: snippet.title || 'Без назви',
        description: snippet.description || '',
        publishedAt: contentDetails.videoPublishedAt || snippet.publishedAt || null,
        thumbnail:
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.default?.url ||
          null,
      };
    })
    .filter(Boolean);

  const viewCounts = await fetchViewCounts(videos.map(video => video.videoId));
  const enrichedVideos = videos.map(video => ({
    ...video,
    viewCount: viewCounts.get(video.videoId) || null,
  }));

  return {
    channel: {
      id: resolvedId,
      title: channelData.snippet?.title || 'Невідомий канал',
      url: `https://www.youtube.com/channel/${resolvedId}`,
    },
    videos: enrichedVideos,
    nextPageToken: playlistResponse.nextPageToken || null,
  };
}

async function fetchViewCounts(videoIds) {
  const viewMap = new Map();
  if (!videoIds.length) {
    return viewMap;
  }

  const response = await youtubeRequest('videos', {
    part: 'statistics',
    id: videoIds.join(','),
    maxResults: videoIds.length,
  });

  (response.items || []).forEach(item => {
    viewMap.set(item.id, item.statistics?.viewCount || null);
  });

  return viewMap;
}

async function fetchAnalysisData(videoIds) {
  if (!videoIds.length) {
    return [];
  }

  const response = await youtubeRequest('videos', {
    part: 'snippet,statistics,topicDetails',
    id: videoIds.join(','),
    maxResults: videoIds.length,
  });

  const resultMap = new Map();
  (response.items || []).forEach(item => {
    const snippet = item.snippet || {};
    const statistics = item.statistics || {};
    const description = snippet.description || '';

    resultMap.set(item.id, {
      videoId: item.id,
      title: snippet.title || 'Без назви',
      description,
      thumbnail:
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.default?.url ||
        null,
      tags: extractHashtags(description),
      keywords: (snippet.tags || []).join(', '),
      viewCount: statistics.viewCount ? Number(statistics.viewCount).toLocaleString('uk-UA') : '0',
      publishedAt: formatCyprusDate(snippet.publishedAt),
    });
  });

  return videoIds.map(id => resultMap.get(id)).filter(Boolean);
}

function formatCyprusDate(dateString) {
  if (!dateString) {
    return 'N/A';
  }

  const date = new Date(dateString);
  return date.toLocaleString('uk-UA', {
    timeZone: CYPRUS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function extractHashtags(description = '') {
  const matches = description.match(/#([\p{L}\p{M}\w-]+)/gu);
  if (!matches || matches.length === 0) {
    return '—';
  }
  return matches.join(', ');
}

async function resolveChannelId(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Введіть посилання на канал');
  }

  if (/^UC[\w-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  let parsed;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch (error) {
    return lookupChannelBySearch(trimmed.replace(/^@/, ''));
  }

  const pathname = parsed.pathname.replace(/\/+$/, '');

  if (pathname.startsWith('/channel/')) {
    return pathname.split('/channel/')[1];
  }

  if (pathname.startsWith('/user/')) {
    const username = pathname.split('/user/')[1];
    return lookupChannelByUsername(username);
  }

  if (pathname.startsWith('/@')) {
    const handle = pathname.slice(2);
    return lookupChannelBySearch(handle);
  }

  if (pathname.startsWith('/c/')) {
    const custom = pathname.split('/c/')[1];
    return lookupChannelBySearch(custom);
  }

  const fallbackSegment = pathname.split('/').filter(Boolean).pop();
  return lookupChannelBySearch(fallbackSegment || trimmed);
}

async function lookupChannelByUsername(username) {
  const response = await youtubeRequest('channels', {
    part: 'id',
    forUsername: username,
    maxResults: 1,
  });

  const channel = response.items?.[0];
  if (!channel) {
    throw new Error('Канал з таким ім’ям не знайдено');
  }
  return channel.id;
}

async function lookupChannelBySearch(query) {
  const response = await youtubeRequest('search', {
    part: 'id',
    q: query,
    type: 'channel',
    maxResults: 1,
  });

  const item = response.items?.[0];
  if (!item?.id?.channelId) {
    throw new Error('Не вдалося знайти канал за посиланням');
  }
  return item.id.channelId;
}

async function youtubeRequest(endpoint, params = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  const searchParams = { ...params, key: YT_API_KEY };

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    const message = data.error?.message || 'Сталася помилка YouTube API';
    throw new Error(message);
  }

  return data;
}
