// The portfolio home: the 16:9 wall of works and, under it, the row of vertical films, both from works.js,
// with their silent loops. A loop plays while the pointer is over its card (or the card has keyboard focus);
// on touch screens the card nearest the middle of the screen plays. Visitors with reduced motion or Save-Data
// keep stills.

import { WALL, VERTICAL_TILES } from './works.js';
import { h, typo, plain, picture, calmMode, mediaPath, rootPath, silentLoop, tryPlay } from './dom.js';
import { initTheme } from './theme.js';

const CARD_SIZES = '(min-width: 1200px) 33vw, (min-width: 700px) 50vw, 100vw';
// Rows of two on a wide screen (grid.css): two left over in the last row of three gives 2 + 3 + 3,
// one left over gives 2 + 2 + 3. These first cards are half the width.
const WIDE_CARD_SIZES = '(min-width: 700px) 50vw, 100vw';
const WIDE_CARDS = [0, 4, 2][WALL.length % 3];
const EAGER_CARDS = 3; // the first row loads at once, the rest when scrolled near
// Cards seen without scrolling: the first one gets its poster first, the ones below the first screen wait.
const CARDS_ON_FIRST_SCREEN = window.matchMedia('(min-width: 1200px)').matches ? 5
  : window.matchMedia('(min-width: 700px)').matches ? 4 : 2;
// Desktop: after load only the loops of the first row are fetched (their first hover starts at once), the rest on
// hover. Fetching all of them (8 MB) kept the page out of the browser's Back cache while they downloaded.
const WARM_CARDS = 2;
// A large first-row card on a wide screen plays the 1280 px loop; every other card the 960 px one.
const LARGE_LOOP = '(min-width: 1200px)';
const IN_VIEW = 0.6; // touch screens: a frame at least this much on screen may play
const FADE_MS = 450; // keep in step with .card__loop in grid.css

function workHref(work) {
  return rootPath() + 'works/' + work.slug + '.html';
}

function caption(title, kind) {
  return h('span', { class: 'card__cap' }, [
    h('span', { class: 'card__title' }, typo(plain(title))),
    ' ',
    h('span', { class: 'card__kind' }, typo(plain(kind))),
  ]);
}

function card(work, index) {
  const wide = index < WIDE_CARDS;
  const media = h('span', { class: 'card__media', style: 'view-transition-name: work-' + work.slug });
  // The first card's poster is also asked for in <head> (make_pages.py): srcset and sizes must stay identical there.
  media.append(picture({
    src: mediaPath(work.slug, 'poster'),
    srcset: mediaPath(work.slug, 'poster-960') + ' 960w, ' + mediaPath(work.slug, 'poster-1280') + ' 1280w, '
      + mediaPath(work.slug, 'poster') + ' 1920w',
    sizes: wide ? WIDE_CARD_SIZES : CARD_SIZES,
    alt: '',
    width: 1920,
    height: 1080,
    eager: index < EAGER_CARDS,
    priority: index === 0 ? 'high' : index >= CARDS_ON_FIRST_SCREEN ? 'low' : undefined,
    box: media,
  }));
  const loop = wide && window.matchMedia(LARGE_LOOP).matches ? 'loop' : 'loop-960';
  return h('li', { class: 'card', id: work.slug, 'data-slug': work.slug, 'data-loop': loop },
    h('a', { class: 'card__link', href: workHref(work) }, [media, caption(work.title, work.kind)]));
}

/** A tile of the vertical row: its own 9:16 poster and loop. A work that is also on the wall keeps its id and
 *  its page transition there, so the tile of such a work has neither. */
function tile(work) {
  const onWall = work.wall !== false;
  const media = h('span', { class: 'card__media card__media--tall', style: onWall ? null : 'view-transition-name: work-' + work.slug });
  media.append(picture({
    src: mediaPath(work.slug, work.verticalTile.poster),
    alt: '',
    width: 720,
    height: 1280,
    priority: 'low',
    box: media,
  }));
  return h('li', { class: 'card card--tall', id: onWall ? null : work.slug, 'data-slug': work.slug, 'data-loop': work.verticalTile.loop },
    h('a', { class: 'card__link', href: workHref(work) }, [media, caption(work.title, work.verticalTile.kind || work.kind)]));
}

/** The loop of one card, created on first need. */
function loopFor(link) {
  const media = link.querySelector('.card__media');
  let video = media.querySelector('.card__loop');
  if (video) return video;
  video = silentLoop('card__loop');
  const owner = link.closest('.card');
  video.src = mediaPath(owner.dataset.slug, owner.dataset.loop || 'loop', '.mp4');
  video.addEventListener('playing', () => video.classList.add('is-on'));
  video.addEventListener('error', () => video.remove(), { once: true });
  media.append(video);
  return video;
}

function play(link) {
  const video = loopFor(link);
  window.clearTimeout(Number(video.dataset.rewind || 0));
  tryPlay(video);
}

function stop(link) {
  const video = link.querySelector('.card__loop');
  if (!video) return;
  video.pause();
  video.classList.remove('is-on');
  // Back to the first frame once it has faded out, so the next hover starts from the top.
  video.dataset.rewind = String(window.setTimeout(() => {
    if (video.paused) video.currentTime = 0;
  }, FADE_MS));
}

function hoverLoops(links) {
  links.forEach((link) => {
    link.addEventListener('pointerenter', () => play(link));
    link.addEventListener('pointerleave', () => stop(link));
    link.addEventListener('focus', () => play(link));
    link.addEventListener('blur', () => stop(link));
  });
  // Once the page itself has loaded, fetch the loops of the first row only: their first hover starts at once.
  const warm = () => links.slice(0, WARM_CARDS).forEach((link) => {
    loopFor(link).preload = 'auto';
  });
  if (document.readyState === 'complete') warm();
  else window.addEventListener('load', warm, { once: true });
}

/** Phones show two or three cards at once: only the one nearest the middle of the screen plays. */
function viewLoops(links) {
  const visible = new Set();
  let current = null;
  let queued = false;
  const pick = () => {
    queued = false;
    const middle = window.innerHeight / 2;
    let best = null;
    let bestDistance = Infinity;
    visible.forEach((link) => {
      const box = link.querySelector('.card__media').getBoundingClientRect();
      if (box.height * IN_VIEW > Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0)) return;
      const distance = Math.abs((box.top + box.bottom) / 2 - middle);
      if (distance < bestDistance) {
        best = link;
        bestDistance = distance;
      }
    });
    if (best === current) return;
    if (current) stop(current);
    current = best;
    if (current) play(current);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(pick);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
    schedule();
  }, { threshold: [0, IN_VIEW, 1] });
  links.forEach((link) => observer.observe(link));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  // After the tab was hidden every loop is paused: start the middle one again.
  return () => {
    current = null;
    schedule();
  };
}

/** One set of loops for the wall and the vertical row: on a phone still only one card plays at a time. */
function initLoops(lists) {
  if (calmMode() || typeof IntersectionObserver !== 'function') return;
  const links = lists.flatMap((list) => Array.from(list.querySelectorAll('.card__link')));
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const resume = canHover ? null : viewLoops(links);
  if (canHover) hoverLoops(links);
  // A hidden tab plays nothing.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('.card__loop').forEach((video) => video.pause());
    else if (resume) resume();
  });
}

/** Back from a work page at index.html#<slug>: the grid is built by now, bring that card into view. */
function revealTarget() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (target && target.classList.contains('card')) target.scrollIntoView({ block: 'center' });
}

function boot() {
  initTheme();
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;
  grid.replaceChildren(...WALL.map(card));
  grid.removeAttribute('aria-busy');
  const row = document.querySelector('[data-verticals]');
  if (row) {
    row.replaceChildren(...VERTICAL_TILES.map(tile));
    row.removeAttribute('aria-busy');
  }
  initLoops([grid, row].filter(Boolean));
  revealTarget();
}

boot();
