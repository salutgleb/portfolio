// DOM helpers shared by the portfolio pages: an element builder that never parses HTML,
// Russian typography as on wearesalut.com, the {{…}} marks of unconfirmed facts and a few icons.

const NBSP = ' ';
const NB_HYPHEN = '‑';
// A word that should not hang at the end of a line: one or two letters, a number or the «×» of
// a collaboration («в», «на», «6», «+7», «MIU MIU × New Balance»). lead-form.js has the same rule
// without «×».
const SHORT_WORD = /^(?:[«„(]?[А-Яа-яЁёA-Za-z]{1,2}|\+?\d+|×)$/;
// «Balance 530»: a model number stays with the word before it.
const LATIN_BEFORE_NUMBER = /([A-Za-z])\s+(?=\d)/g;
const DIGIT_HYPHEN = /(\d)-(?=\d)/g;
const TBC = /\{\{([^{}]+)\}\}/g;
const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = Object.freeze({
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  play: '<path d="M9 6.6v10.8L17.6 12z"/>',
  pause: '<path d="M7 6h3.4v12H7zM13.6 6H17v12h-3.4z"/>',
  theme: '<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none"/>',
});

/** Non-breaking spaces after short words and inside model numbers, non-breaking hyphens in numbers. */
export function typo(text) {
  const words = String(text == null ? '' : text).split(' ');
  return words
    .reduce((out, word, index) => (index === 0 ? word : out + (SHORT_WORD.test(words[index - 1]) ? NBSP : ' ') + word), '')
    .replace(LATIN_BEFORE_NUMBER, '$1' + NBSP)
    .replace(DIGIT_HYPHEN, '$1' + NB_HYPHEN);
}

/** Text without the {{…}} marks, for titles and labels. */
export function plain(text) {
  return String(text == null ? '' : text).replace(TBC, '$1');
}

function append(node, children) {
  [].concat(children === undefined ? [] : children).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) append(node, child);
    else node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

/**
 * Build an element: h('a', { class: 'x', href: '…' }, ['text', node]).
 * Strings always go in as text; attributes with null, undefined or false are left out.
 * @param {string} tag
 * @param {Record<string, unknown>} [attrs]
 * @param {unknown} [children]
 * @returns {HTMLElement}
 */
export function h(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    node.setAttribute(key, value === true ? '' : String(value));
  });
  return append(node, children);
}

/**
 * Typeset text with its {{…}} parts wrapped in <span class="tbc">: a plain sentence for the visitor,
 * underlined only with ?review=1 in the address (CSS in base.css).
 * @param {string} text
 * @returns {DocumentFragment}
 */
export function rich(text) {
  const source = String(text == null ? '' : text);
  const fragment = document.createDocumentFragment();
  let last = 0;
  source.replace(TBC, (match, inner, index) => {
    if (index > last) fragment.append(typo(source.slice(last, index)));
    fragment.append(h('span', { class: 'tbc' }, typo(inner)));
    last = index + match.length;
    return match;
  });
  if (last < source.length) fragment.append(typo(source.slice(last)));
  return fragment;
}

/** A stroke icon from the 24px set above, hidden from screen readers. */
export function icon(name, className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'icon' + (className ? ' ' + className : ''));
  svg.innerHTML = ICONS[name] || '';
  return svg;
}

/**
 * An image that keeps its box before it loads and fades in once it has (class is-loaded on the box).
 * A missing file leaves a quiet empty box instead of a broken-image icon.
 * priority: 'high' for the first picture a visitor sees, 'low' for the ones below the first screen.
 * @param {{ src: string, srcset?: string, sizes?: string, alt?: string, width: number, height: number,
 *           eager?: boolean, priority?: 'high' | 'low', box: HTMLElement }} opts
 */
export function picture(opts) {
  const img = document.createElement('img');
  img.alt = opts.alt || '';
  img.width = opts.width;
  img.height = opts.height;
  img.decoding = 'async';
  img.loading = opts.eager ? 'eager' : 'lazy';
  if (opts.priority) img.setAttribute('fetchpriority', opts.priority);
  img.addEventListener('load', () => opts.box.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => {
    if (img.hasAttribute('srcset')) {
      // A missing small size falls back once to the main file.
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = opts.src;
      return;
    }
    opts.box.classList.add('is-missing');
  });
  if (opts.sizes) img.sizes = opts.sizes;
  if (opts.srcset) img.srcset = opts.srcset;
  img.src = opts.src;
  return img;
}

/** Visitors who asked for less motion or less data keep still frames instead of silent loops. */
export function calmMode() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const connection = navigator.connection;
  return reduced || Boolean(connection && connection.saveData);
}

/** Path prefix from the page to the site root: '' on index.html, '../' on works/*.html. */
export function rootPath() {
  return document.body.dataset.root || '';
}

/** media/<slug>/<name>.jpg from the current page. */
export function mediaPath(slug, name, ext) {
  return rootPath() + 'media/' + slug + '/' + name + (ext === undefined ? '.jpg' : ext);
}

/** A silent looping video for the grid and for works without a film. Nothing loads until src is set. */
export function silentLoop(className) {
  const video = document.createElement('video');
  video.className = className;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';
  ['muted', 'playsinline', 'webkit-playsinline', 'disablepictureinpicture', 'disableremoteplayback']
    .forEach((name) => video.setAttribute(name, ''));
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  return video;
}

/** play() that never throws: a refused autoplay (power saving, policy) leaves the still frame. */
export function tryPlay(video) {
  const attempt = video.play();
  if (attempt && typeof attempt.catch === 'function') {
    attempt.catch((error) => {
      video.dataset.blocked = error && error.name ? error.name : 'blocked';
    });
  }
}
