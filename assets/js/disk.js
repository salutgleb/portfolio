// Films that play straight from the public Yandex Disk folder (works.js, field ydisk). The page asks the
// public Disk API for a temporary link to the file and gives it to a plain <video> as a progressive MP4:
// the long episodes stay off the site, seeking works through range requests.
// The Disk downloader refuses a foreign Referer, so work pages carry <meta name="referrer" content="no-referrer">
// and the API call itself is made without one. No login, no keys: the folder is public.

import { YDISK } from './works.js';

const API = 'https://cloud-api.yandex.net/v1/disk/public/resources/download';
const TIMEOUT_MS = 15000;
const LINK_TTL_MS = 20 * 60 * 1000; // an older link is asked for again before playing
const LINK_HOST = /^https:\/\/([a-z0-9-]+\.)*yandex\.(ru|net)\//;

/** The file in the Disk web interface, for «Открыть на Яндекс Диске». */
export function diskPage(path) {
  return YDISK + String(path).split('/').map(encodeURIComponent).join('/');
}

async function requestLink(path) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const query = new URLSearchParams({ public_key: YDISK, path });
    const response = await fetch(API + '?' + query, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Disk API answered ' + response.status);
    const data = await response.json();
    const href = data && typeof data.href === 'string' ? data.href : '';
    if (!LINK_HOST.test(href)) throw new Error('Disk API gave no download link');
    return href;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * The link to one file, asked for once and kept while fresh.
 * @param {string} path the file inside the public folder
 * @returns {{ fresh: () => string, get: (force?: boolean) => Promise<string> }}
 */
export function diskFile(path) {
  let link = '';
  let at = 0;
  let pending = null;
  return Object.freeze({
    fresh: () => (link && Date.now() - at < LINK_TTL_MS ? link : ''),
    get(force) {
      if (!force && link && Date.now() - at < LINK_TTL_MS) return Promise.resolve(link);
      if (!pending) {
        pending = requestLink(path)
          .then((href) => {
            link = href;
            at = Date.now();
            return href;
          })
          .finally(() => {
            pending = null;
          });
      }
      return pending;
    },
  });
}
