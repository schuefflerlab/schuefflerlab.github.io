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

function createPublicationHtml(item) {
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
      <p class="publication-title">${escapeHtml(title)}</p>
      <p class="publication-meta">${escapeHtml(authors)}</p>
      ${venue ? `<p class="publication-meta">${escapeHtml(venue)}</p>` : ''}
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

async function renderZoteroPublications() {
  const container = document.getElementById('zotero-publications');
  if (!container) return;
  container.innerHTML = '<p>Loading publications from Zotero…</p>';

  try {
    const items = await fetchZoteroItems();
    if (!items.length) {
      container.innerHTML = '<p>No Zotero publications found for this collection.</p>';
      return;
    }

    const sortedItems = sortPublications(items);
    const html = sortedItems
      .map((item) => createPublicationHtml(item))
      .join('');

    container.innerHTML = `
      <div class="publications">
        <p>Publications loaded from Zotero group <strong>${zoteroGroupID}</strong>.</p>
        <ul class="publication-list">${html}</ul>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p>Failed to load Zotero publications: ${escapeHtml(error.message)}</p>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderZoteroPublications);
} else {
  renderZoteroPublications();
}
