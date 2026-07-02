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
  let authors = formatCreators(data.creators) || 'Unknown authors';
  let venue = [data.publicationTitle || data.bookTitle || data.conferenceName || data.meetingName || data.repository, data.date].filter(Boolean).join(', ');
  let links = [];
  if (data.DOI) {
    links.push(`<a href="https://doi.org/${encodeURIComponent(data.DOI)}" target="_blank" rel="noopener">DOI</a>`);
  }
  if (data.url) {
    links.push(`<a href="${escapeHtml(data.url)}" target="_blank" rel="noopener">URL</a>`);
  }
  if (data.archiveLocation) {
    links.push(`<span>${escapeHtml(data.archiveLocation)}</span>`);
  }

  return `
    <li class="publication-item panel">
      <p class="publication-title">${highlightText(title, query)}</p>
      <p class="publication-meta">${highlightText(authors, query)}</p>
      ${venue ? `<p class="publication-meta">${highlightText(venue, query)}</p>` : ''}
      <div class="publication-links">${links.join(' ')}</div>
    </li>
  `;
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  let match = linkHeader.match(/<([^>]+)>; rel="next"/);
  return match ? match[1] : null;
}

async function fetchZoteroItems() {
  let items = [];
  let url = `${zoteroEndpoint}?limit=100&start=0`; 
  while (url) {
    url = `${url}&v=3&key=${accessKey}&format=json`;
    let response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Zotero fetch failed: ${response.status} ${response.statusText}`);
    }
    let batch = await response.json();
    items.push(...batch);
    url = parseNextLink(response.headers.get('Link'));
  }
  return items;
}

function getPublicationTimestamp(item) {
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

function filterPublications(publications) {
  return publications.filter(obj => {
        return !['note', 'attachment'].includes(obj.data?.itemType || '');
    })
}

function matchesSearch(item, query) {
  if (!query) return true;
  let data = item.data || {};
  let title = data.title || data.shortTitle || '';
  let authors = formatCreators(data.creators);
  let venue = [data.publicationTitle || data.bookTitle || data.conferenceName || data.meetingName || data.repository, data.date, data.publisher].filter(Boolean).join(' ');
  let haystack = [title, authors, venue, data.url || '', data.DOI || ''].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderPublications(items, query = '') {
  let container = document.getElementById('zotero-publications');
  if (!container) return;
  let filtered = items.filter((item) => matchesSearch(item, query));
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
  if (!container || !searchInput) return;
  container.innerHTML = '<p>Loading publications ...</p>';
  searchInput.disabled = true;

  try {
    let items = await fetchZoteroItems();
    let filteredZoteroItems = filterPublications(items);
    let sortedZoteroItems = sortPublications(filteredZoteroItems);
    renderPublications(sortedZoteroItems);
    searchInput.disabled = false;
    searchInput.addEventListener('input', (event) => {
      renderPublications(sortedZoteroItems, event.target.value);
    });
  } catch (error) {
    container.innerHTML = `<p>Failed to load publications: ${escapeHtml(error.message)}</p>`;
    searchInput.disabled = false;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderZoteroPublications);
} else {
  renderZoteroPublications();
}
