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

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function createPublicationHtml(item, query) {
  const data = item.data || {};
  const title = data.title || data.shortTitle || 'Untitled';
  const authors = formatCreators(data.creators) || 'Unknown authors';
  const venue = [data.publicationTitle, data.date].filter(Boolean).join(', ');
  const links = [];
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
    <li class="publication-item">
      <p class="publication-title">${highlightText(title, query)}</p>
      <p class="publication-meta">${highlightText(authors, query)}</p>
      ${venue ? `<p class="publication-meta">${highlightText(venue, query)}</p>` : ''}
      <div class="publication-links">${links.join(' ')}</div>
    </li>
  `;
}

function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>; rel="next"/);
  return match ? match[1] : null;
}

async function fetchZoteroItems() {
  const items = [];
  let url = `${zoteroEndpoint}?limit=100&start=0`; 
  while (url) {
    url = `${url}&v=3&key=${accessKey}&format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Zotero fetch failed: ${response.status} ${response.statusText}`);
    }
    const batch = await response.json();
    items.push(...batch);
    url = parseNextLink(response.headers.get('Link'));
  }
  return items;
}

function sortPublications(publications) {
  return publications.slice().sort((a, b) => {
    const da = Date.parse(a.data?.date || '') || 0;
    const db = Date.parse(b.data?.date || '') || 0;
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
  const data = item.data || {};
  const title = data.title || data.shortTitle || '';
  const authors = formatCreators(data.creators);
  const venue = [data.publicationTitle, data.date, data.publisher].filter(Boolean).join(' ');
  const notes = [data.abstractNote, data.notes].filter(Boolean).join(' ');
  const haystack = [title, authors, venue, notes, data.url || '', data.DOI || ''].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderPublications(items, query = '') {
  const container = document.getElementById('zotero-publications');
  if (!container) return;
  const filtered = items.filter((item) => matchesSearch(item, query));
  if (!filtered.length) {
    container.innerHTML = `
      <div class="publications">
        <p>Publications loaded from Zotero group <strong>${zoteroGroupID}</strong>.</p>
        <p>No publications match "${escapeHtml(query)}".</p>
      </div>
    `;
    return;
  }

  const html = filtered
    .map((item) => createPublicationHtml(item, query))
    .join('');

  container.innerHTML = `
    <div class="publications">
      <p>Publications loaded from Zotero group <strong>${zoteroGroupID}</strong>.</p>
      <ul class="publication-list">${html}</ul>
    </div>
  `;
}

async function renderZoteroPublications() {
  const container = document.getElementById('zotero-publications');
  const searchInput = document.getElementById('zotero-search-input');
  if (!container || !searchInput) return;
  container.innerHTML = '<p>Loading publications from Zotero…</p>';
  searchInput.disabled = true;

  try {
    const items = await fetchZoteroItems();
    let allZoteroItems = sortPublications(items);
    let filteredZoteroItems = filterPublications(allZoteroItems);
    renderPublications(filteredZoteroItems);
    searchInput.disabled = false;
    searchInput.addEventListener('input', (event) => {
      renderPublications(filteredZoteroItems, event.target.value);
    });
  } catch (error) {
    container.innerHTML = `<p>Failed to load Zotero publications: ${escapeHtml(error.message)}</p>`;
    searchInput.disabled = false;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderZoteroPublications);
} else {
  renderZoteroPublications();
}
