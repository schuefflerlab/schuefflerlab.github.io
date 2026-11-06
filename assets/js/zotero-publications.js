const zoteroGroupID = '2938862';
const zoteroCollectionKey = 'H4TUEY6S';
const accessKey = 'TbhYOPqtA9CDpuQKxxUUevfx';
const zoteroEndpoint = `https://api.zotero.org/groups/${zoteroGroupID}/collections/${zoteroCollectionKey}/items`;

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"]+/g, (char) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[char];
  });
}

function formatCreators(creators) {
  if (!Array.isArray(creators) || creators.length === 0) return '';
  return creators
    .map((creator) => creator.name || [creator.firstName, creator.lastName].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ');
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDateString(value) {
  if (!value) return null;
  let text = String(value).trim();
  if (!text) return null;

  // strip surrounding whitespace and punctuation
  text = text.replace(/^[\s\u00A0\-–—]+|[\s\u00A0\-–—]+$/g, '');

  const monthNames = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sept: 9, sep: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12
  };

  function buildDate(year, month = 1, day = 1) {
    year = Number(year);
    month = Number(month);
    day = Number(day);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return Date.UTC(year, month - 1, day);
  }

  function normalize(text) {
    return text.replace(/[\u2013\u2014]/g, '-').replace(/[\u00A0]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function tryParse(candidate) {
    if (!candidate) return null;
    candidate = normalize(candidate.replace(/[(),;]+/g, ' '));

    // ISO-like dates: 2026-03-12, 2026/03/02, 2026.03.02, 2023-12-5
    let m = candidate.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
    if (m) return buildDate(m[1], m[2], m[3]);

    // Year only: 2026
    m = candidate.match(/^(\d{4})$/);
    if (m) return buildDate(m[1], 1, 1);

    // Month/year or year/month: 10/2025, 3/2026, 2022/10
    m = candidate.match(/^(\d{1,2})[\/](\d{4})$/);
    if (m) {
      const first = Number(m[1]);
      const second = Number(m[2]);
      if (second >= 1000) {
        return buildDate(second, first, 1);
      }
    }
    m = candidate.match(/^(\d{4})[\/](\d{1,2})$/);
    if (m) return buildDate(m[1], m[2], 1);

    // U.S. style month/day/year: 04/27/2022, 02/23/2021, 1/1/2020
    m = candidate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      let year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      return buildDate(year, m[1], m[2]);
    }

    // European day.month.year: 12.11.2025, 25.06.25, 21. Jun. 2017, 2025-06-25 25.06.25
    m = candidate.match(/^(\d{1,2})[\. ]+(\d{1,2})[\. ]+(\d{2,4})$/);
    if (m) {
      let year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      return buildDate(year, m[2], m[1]);
    }

    // Month name day, year: July 14, 2021 | Jun 18, 2019 | April 28, 2021
    m = candidate.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      const month = monthNames[m[1].toLowerCase()];
      if (month) return buildDate(m[3], month, m[2]);
    }

    // Day month year: 21. Jun. 2017
    m = candidate.match(/^(\d{1,2})[\. ]+([A-Za-z]+)\.?[\. ]+(\d{4})$/);
    if (m) {
      const month = monthNames[m[2].toLowerCase()];
      if (month) return buildDate(m[3], month, m[1]);
    }

    // Pieces like '2025-06-25 25.06.25' - parse first ISO-like segment
    m = candidate.match(/^(\d{4}[-\/\.\d]+)$/);
    if (m) {
      const candidateParts = candidate.split(' ');
      for (const part of candidateParts) {
        const parsed = tryParse(part);
        if (parsed !== null) return parsed;
      }
    }

    return null;
  }

  const parts = text.split(/\s+/);
  for (const part of parts) {
    const parsed = tryParse(part);
    if (parsed !== null) return parsed;
  }

  return tryParse(text);
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  let escaped = escapeHtml(text);
  let regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function createPublicationHtml(item, query) {
  let data = item.data || {};
  let title = data.title || data.shortTitle || 'Untitled';
  let authors = formatCreators((data.creators || []).filter(x => (x.creatorType == "author" || x.creatorType == "presenter"))) || 'Unknown authors';
  let venue = [data.publicationTitle || data.bookTitle || data.conferenceName || data.meetingName || data.repository, new Date(getPublicationTimestamp(item)).toISOString().slice(0, 7).split('-').reverse().join('/')].filter(Boolean).join(', ');
  let links = [];
  if (data.DOI) {
    links.push(`doi: <a href="https://doi.org/${encodeURIComponent(data.DOI)}" target="_blank" rel="noopener">${data.DOI}</a>`);
  }
  if (data.url) {
    links.push(`<a href="${escapeHtml(data.url)}" target="_blank" rel="noopener">read article...</a>`);
  }
  if (data.archiveLocation) {
    links.push(`<span>${escapeHtml(data.archiveLocation)}</span>`);
  }
  let imageHtml = item.imageUrl
    ? `<img class="publication-image" src="${escapeHtml(item.imageUrl)}" alt="img" loading="lazy" />`
    : '<span class="publication-image-placeholder" aria-hidden="true"></span>';

  return `
    <li class="publication-item panel">
      <div class="publication-row">
        ${imageHtml}
        <div class="publication-content">
          <p class="publication-authors">${highlightText(authors, query)}</p>
          <p class="publication-title">${highlightText(title, query)}</p>
          ${venue ? `<p class="publication-meta">${highlightText(venue, query)}</p>` : ''}
          <div class="publication-links">${links.join(' ')}</div>
        </div>
      </div>
    </li>
  `;
}

function getPublicationImageUrl(children) {
  if (!Array.isArray(children) || !children.length) return '';

  const attachment = children.find((child) => {
    let data = child?.data || {};
    return data.itemType === 'attachment' && data.contentType?.startsWith('image/') && child?.links?.enclosure?.href;
  });

  if (!attachment?.links?.enclosure?.href) {
    return '';
  }

  let imageUrl = new URL(attachment.links.enclosure.href);
  imageUrl.searchParams.set('key', accessKey);
  return imageUrl.toString();
}

const pageSize = 25; // small pages are answered much faster by the Zotero API and are fetched in parallel
const cacheKey = `zotero-publications:${zoteroGroupID}:${zoteroCollectionKey}`;
const cacheFormat = 1;

async function fetchPage(baseUrl, start) {
  const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}limit=${pageSize}&start=${start}&v=3&key=${accessKey}&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Zotero fetch failed: ${response.status} ${response.statusText}`);
  }
  return {
    items: await response.json(),
    total: Number(response.headers.get('Total-Results')),
    version: response.headers.get('Last-Modified-Version')
  };
}

// Requests all pages at once, using the expected item count (e.g. from the cache) as a guess.
// If the collection turns out to be bigger, the missing pages are fetched in a second round.
async function fetchAllPages(baseUrl, expectedTotal = 250) {
  const starts = [];
  for (let start = 0; start < Math.max(expectedTotal, 1); start += pageSize) starts.push(start);
  const pages = await Promise.all(starts.map((start) => fetchPage(baseUrl, start)));
  const total = pages[0].total || 0;
  const extraStarts = [];
  for (let start = starts.length * pageSize; start < total; start += pageSize) extraStarts.push(start);
  pages.push(...(await Promise.all(extraStarts.map((start) => fetchPage(baseUrl, start)))));
  return {
    items: pages.flatMap((page) => page.items),
    total,
    version: pages[0].version
  };
}

// Cheap request (~0.4s) that only returns the current library version.
async function fetchLibraryVersion() {
  const response = await fetch(`${zoteroEndpoint}?format=versions&limit=1&key=${accessKey}`);
  if (!response.ok) throw new Error(`Zotero fetch failed: ${response.status} ${response.statusText}`);
  return response.headers.get('Last-Modified-Version');
}

// Keeps only the fields needed for rendering so the cache stays small.
function slimItem(item) {
  const d = item.data || {};
  const fields = ['itemType', 'title', 'shortTitle', 'creators', 'publicationTitle', 'bookTitle', 'conferenceName',
    'meetingName', 'repository', 'date', 'accessDate', 'DOI', 'url', 'archiveLocation', 'parentItem', 'contentType'];
  const data = {};
  for (const field of fields) if (d[field]) data[field] = d[field];
  const enclosure = item.links?.enclosure?.href;
  return { key: item.key, data, links: enclosure ? { enclosure: { href: enclosure } } : undefined };
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    return cached && cached.format === cacheFormat && Array.isArray(cached.items) ? cached : null;
  } catch (error) {
    return null;
  }
}

function writeCache(result) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      format: cacheFormat,
      version: result.version,
      total: result.total,
      items: result.items.map(slimItem)
    }));
  } catch (error) {
    // storage full or unavailable: caching is optional
  }
}

// Turns raw Zotero items (publications + attachments) into sorted publications with image URLs and timestamps.
function preparePublications(items) {
  const byParent = new Map();
  for (const attachment of filterAttachments(items)) {
    const parent = attachment?.data?.parentItem;
    if (!parent) continue;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(attachment);
  }
  const publications = filterPublications(items);
  for (const item of publications) {
    item.imageUrl = getPublicationImageUrl(byParent.get(item.key));
    item.timestamp = computePublicationTimestamp(item);
  }
  return sortPublications(publications);
}

function getPublicationTimestamp(item) {
  return item.timestamp ?? computePublicationTimestamp(item);
}

function computePublicationTimestamp(item) {
  const dateStr = item.data?.date || item.data?.accessDate || '';
  const parsed = parseDateString(dateStr);
  if (parsed !== null) return parsed;
  // fallback to native parse for uncommon strings
  const fallback = Date.parse(dateStr);
  return Number.isFinite(fallback) ? fallback : 0;
}

function sortPublications(publications) {
  return publications.slice().sort((a, b) => {
    let da = getPublicationTimestamp(a);
    let db = getPublicationTimestamp(b);
    return db - da;
  });
}

function filterPublications(items) {
  return items.filter(obj => {
        return !['note', 'attachment'].includes(obj.data?.itemType || '');
    })
}

function filterAttachments(items) {
  return items.filter(obj => {
        return ['attachment'].includes(obj.data?.itemType || '');
    })
}

function matchesSearch(item, query) {
  if (!query) return true;
  let data = item.data || {};
  let title = data.title || data.shortTitle || '';
  let authors = formatCreators((data.creators || []).filter(x => (x.creatorType == "author" || x.creatorType == "presenter"))) || '';
  let venue = getPublicationVenue(item);
  let haystack = [title, authors, venue, data.url || '', data.DOI || ''].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function getPublicationVenue(item) {
  let data = item.data || {};
  return data.publicationTitle || data.bookTitle || data.conferenceName || data.meetingName || data.repository || '';
}

function isPeerReviewed(item) {
  return item.data.itemType != "preprint" && !/workshop|jahrestagung|annual meeting|european congress|symposium|arXiv|biorxiv|in review/i.test(getPublicationVenue(item));
}

function renderPublications(items, query = '', onlyPeerReviewed = false) {
  let container = document.getElementById('zotero-publications');
  if (!container) return;
  let filtered = items.filter((item) => matchesSearch(item, query) && (!onlyPeerReviewed || isPeerReviewed(item)));
  if (!filtered.length) {
    container.innerHTML = `
      <div class="publications">
        <p>No publications match "${escapeHtml(query)}".</p>
      </div>
    `;
    return;
  }

  let html = filtered
    .map((item) => createPublicationHtml(item, query))
    .join('');

  container.innerHTML = `
    <div class="publications">
      <ul class="publication-list">${html}</ul>
    </div>
  `;
}

async function renderZoteroPublications() {
  let container = document.getElementById('zotero-publications');
  let searchInput = document.getElementById('zotero-search-input');
  let peerReviewedInput = document.getElementById('peer-reviewed-input');
  if (!container || !searchInput || !peerReviewedInput) return;

  let publications = [];
  const render = () => renderPublications(publications, searchInput.value, peerReviewedInput.checked);
  searchInput.addEventListener('input', render);
  peerReviewedInput.addEventListener('change', render);

  // 1) Show cached publications immediately (repeat visits).
  const cached = readCache();
  if (cached) {
    publications = preparePublications(cached.items);
    render();
  } else {
    container.innerHTML = '<div>Loading <div class="loader"></div></div>';
    searchInput.disabled = true;
    peerReviewedInput.disabled = true;
  }

  // 2) Refresh from Zotero; skip the full download if the library version is unchanged.
  try {
    if (cached?.version && (await fetchLibraryVersion()) === cached.version) return;
    const result = await fetchAllPages(zoteroEndpoint, cached?.total);
    writeCache(result);
    publications = preparePublications(result.items);
    render();
  } catch (error) {
    if (!cached) {
      container.innerHTML = `<p>Failed to load publications: ${escapeHtml(error.message)}</p>`;
    } else {
      console.warn('Failed to refresh publications', error);
    }
  } finally {
    searchInput.disabled = false;
    peerReviewedInput.disabled = false;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderZoteroPublications);
} else {
  renderZoteroPublications();
}

//items = await fetchZoteroItems();
//item = items.find(x => x.data.title == "...")
