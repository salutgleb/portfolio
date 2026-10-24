// A work page (works/<slug>.html): the slug comes from <body data-slug>, everything else from
// works.js. Top bar with «Все работы» and the neighbours, the video stage, title, client and
// format, «Задача / Что делали / Итог», stills and the next and previous works.
// Keys: the left and right arrows open the neighbours while no film plays, Esc goes back to the grid.

import { SHOWN } from './works.js';
import { h, typo, rich, plain, icon, picture, mediaPath, rootPath } from './dom.js';
import { mountStage } from './player.js';
import { initTheme } from './theme.js';

const TEXT = Object.freeze({
  all: 'Все работы',
  prev: 'Предыдущая',
  next: 'Следующая',
  prevWork: 'Предыдущая работа',
  nextWork: 'Следующая работа',
  count: '{n} из {total}',
  nav: 'Работы',
  pager: 'Соседние работы',
  client: 'Клиент',
  format: 'Формат',
  role: 'Роль',
  task: 'Задача',
  did: 'Что делали',
  result: 'Итог',
  still: '{title}, кадр {n}',
  missing: 'Такой работы нет. Все работы на главной странице портфолио.',
});
// The contact block under a work picks up what was just seen: its own lead and, for studio works,
// the format chosen in the form (lead-form.js reads data-kind of #lead-form when it mounts).
const ASK = Object.freeze({
  studio: Object.freeze({
    lead: 'Нужен такой же выпуск или интервью для вашего канала? Напишите тему, кто гость и к какой дате. Студию подберём сами, ответит Глеб.',
    kind: 'studio',
  }),
  event: Object.freeze({
    lead: 'Нужен ролик с вашего мероприятия, выставки или соревнований? Напишите, что за событие, где и когда. Ответит Глеб.',
    kind: '',
  }),
  vertical: Object.freeze({
    lead: 'Нужны такие же вертикальные ролики? Напишите, что снимаем, сколько роликов и к какой дате. Ответит Глеб.',
    kind: '',
  }),
});
const PAGE_SUFFIX = ' · Портфолио SALUT';
const STILL_SIZES = '(min-width: 900px) 33vw, (min-width: 560px) 50vw, 100vw';
const PAGER_SIZES = '(min-width: 700px) 240px, 40vw';

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

function pageOf(work) {
  return work.slug + '.html';
}

function homeOf(work) {
  return rootPath() + 'index.html#' + work.slug;
}

function topBar(work, prev, next, index) {
  return h('nav', { class: 'work-nav', 'aria-label': TEXT.nav }, [
    h('a', { class: 'work-nav__all', href: homeOf(work), 'data-close': '', 'aria-keyshortcuts': 'Escape' }, [
      icon('close'),
      h('span', null, TEXT.all),
    ]),
    // The work's name on the first screen of a wide page; screen readers get it from the h1 below.
    h('p', { class: 'work-nav__title', 'aria-hidden': 'true' }, [
      h('span', { class: 'work-nav__name' }, typo(plain(work.title))),
      ' ',
      h('span', { class: 'work-nav__kind' }, typo(plain(work.kind))),
    ]),
    h('p', { class: 'work-nav__count' }, typo(fill(TEXT.count, { n: index + 1, total: SHOWN.length }))),
    h('a', { class: 'work-nav__step', href: pageOf(prev), rel: 'prev', 'aria-keyshortcuts': 'ArrowLeft' }, [
      TEXT.prev,
      h('span', { class: 'visually-hidden' }, ': ' + plain(prev.title)),
    ]),
    h('a', { class: 'work-nav__step', href: pageOf(next), rel: 'next', 'aria-keyshortcuts': 'ArrowRight' }, [
      TEXT.next,
      h('span', { class: 'visually-hidden' }, ': ' + plain(next.title)),
    ]),
  ]);
}

function row(label, text) {
  return h('div', { class: 'facts__row' }, [h('dt', { class: 'label' }, label), h('dd', null, rich(text))]);
}

function head(work) {
  const facts = [[TEXT.client, work.client], [TEXT.format, work.format], [TEXT.role, work.role]].filter((pair) => pair[1]);
  return h('header', { class: 'work-head' }, [
    // A title that opens with «: the quote hangs in the margin, the letters keep the column edge.
    h('h1', { class: plain(work.title).startsWith('«') ? 'work-title work-title--quote' : 'work-title', id: 'work-title', tabindex: '-1' },
      typo(plain(work.title))),
    facts.length ? h('dl', { class: 'facts' }, facts.map((pair) => row(pair[0], pair[1]))) : null,
  ]);
}

function sar(work) {
  const parts = [[TEXT.task, work.task], [TEXT.did, work.did], [TEXT.result, work.result]].filter((pair) => pair[1]);
  if (!parts.length) return null;
  return h('dl', { class: 'sar' }, parts.map((pair) =>
    h('div', { class: 'sar__item' }, [h('dt', { class: 'label' }, pair[0]), h('dd', null, rich(pair[1]))])));
}

function stills(work) {
  if (!work.stills.length) return null;
  const title = plain(work.title);
  return h('div', { class: 'stills' }, work.stills.map((name, i) => {
    const box = h('figure', { class: 'still' });
    box.append(picture({
      src: mediaPath(work.slug, name),
      sizes: STILL_SIZES,
      alt: fill(TEXT.still, { title, n: i + 1 }),
      width: 1600,
      height: 900,
      box,
    }));
    return box;
  }));
}

function pagerLink(target, label, rel) {
  const thumb = h('span', { class: 'pager__thumb' });
  thumb.append(picture({
    src: mediaPath(target.slug, 'poster-960'),
    sizes: PAGER_SIZES,
    alt: '',
    width: 960,
    height: 540,
    box: thumb,
  }));
  return h('a', { class: 'pager__link pager__link--' + rel, href: pageOf(target), rel }, [
    thumb,
    h('span', { class: 'pager__text' }, [
      h('span', { class: 'pager__label label' }, label),
      h('span', { class: 'pager__title' }, typo(plain(target.title))),
    ]),
  ]);
}

function pager(prev, next) {
  return h('nav', { class: 'pager', 'aria-label': TEXT.pager }, [
    pagerLink(prev, TEXT.prevWork, 'prev'),
    pagerLink(next, TEXT.nextWork, 'next'),
  ]);
}

/** Came here from the grid of this portfolio: Back keeps the grid's scroll position. */
function cameFromHome() {
  try {
    const from = new URL(document.referrer);
    const home = new URL(rootPath() + 'index.html', window.location.href);
    const homeDir = home.pathname.replace(/index\.html$/, '');
    return from.origin === home.origin && (from.pathname === home.pathname || from.pathname === homeDir);
  } catch (error) {
    return false;
  }
}

function close(work) {
  // After a jump inside this page (#contact, the skip link) Back would only drop the hash.
  if (!window.location.hash && cameFromHome() && window.history.length > 1) window.history.back();
  else window.location.href = homeOf(work);
}

function wireClose(work) {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-close]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    close(work);
  });
}

/** Keys that belong to something else: a field, the video controls, a switch, an open full screen. */
function keyIsTaken(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return true;
  if (document.fullscreenElement || document.webkitFullscreenElement) return true;
  const target = event.target instanceof Element ? event.target : null;
  return Boolean(target && target.closest('input, textarea, select, [contenteditable], video, iframe, .player, .seg, .reels, .lead-form'));
}

/** A film that plays keeps the arrows: they would throw the visitor out of it into the next work. */
function filmPlays() {
  const film = document.querySelector('.player__video');
  return Boolean(film && !film.paused);
}

function wireKeys(work, prev, next) {
  document.addEventListener('keydown', (event) => {
    if (keyIsTaken(event)) return;
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && filmPlays()) return;
    if (event.key === 'ArrowLeft') window.location.href = pageOf(prev);
    else if (event.key === 'ArrowRight') window.location.href = pageOf(next);
    else if (event.key === 'Escape') close(work);
    else return;
    event.preventDefault();
  });
}

/** The contact block under the work: the lead of its kind and, for studio works, the format preset. */
function askFor(work) {
  const ask = ASK[work.ask];
  if (!ask) return;
  const lead = document.querySelector('.contact__lead');
  if (lead) lead.textContent = typo(ask.lead);
  const slot = document.getElementById('lead-form');
  if (slot && ask.kind) slot.dataset.kind = ask.kind;
}

function missing(main) {
  main.prepend(h('p', { class: 'work-missing' }, [
    typo(TEXT.missing) + ' ',
    h('a', { href: rootPath() + 'index.html' }, TEXT.all),
  ]));
}

function boot() {
  initTheme();
  const main = document.getElementById('main');
  const slot = document.querySelector('[data-work]');
  const index = SHOWN.findIndex((work) => work.slug === document.body.dataset.slug);
  if (!main || !slot) return;
  if (index === -1) {
    missing(main);
    return;
  }
  const work = SHOWN[index];
  const prev = SHOWN[(index - 1 + SHOWN.length) % SHOWN.length];
  const next = SHOWN[(index + 1) % SHOWN.length];
  const stage = h('section', { class: 'stage', 'aria-label': 'Видео' });
  const parts = [topBar(work, prev, next, index), stage, head(work), sar(work), stills(work), pager(prev, next)];
  slot.replaceChildren(...parts.filter(Boolean));
  slot.removeAttribute('aria-busy');
  askFor(work); // before lead-form.js mounts the form: this module runs first
  mountStage(stage, work);
  document.title = plain(work.title) + PAGE_SUFFIX;
  wireClose(work);
  wireKeys(work, prev, next);
}

boot();
