// The video stage of a work page, built from the work's entry in works.js:
//   films  our own HLS (id): hls.js everywhere except Safari and iOS, which play HLS natively;
//          or a file of the public Yandex Disk folder (ydisk), played as a progressive MP4 (disk.js);
//          a poster with one big play button, native controls after the start, a quality switch;
//          more than five vertical films: a strip of covers instead of text tabs;
//   embed  a RuTube or VK player, created only here, never on the grid; no autoplay;
//   neither: the silent loop of the grid card, without a play button.
// Nothing plays with sound until the visitor presses play.

import { h, icon, typo, plain, mediaPath, silentLoop, tryPlay, calmMode, picture } from './dom.js';
import { diskFile, diskPage } from './disk.js';

const HLS_LIB = new URL('./hls.light.min.js', import.meta.url).href;
const HLS_TYPE = 'application/vnd.apple.mpegurl';
const MAX_RECOVERIES = 2;
const IDLE_ATTACH_MS = 1200; // attach the stream after first paint, or at once on a click
const NARROW_POSTER_PX = 800; // narrower windows get the 960 px poster
const EMBED_HOSTS = Object.freeze(['rutube.ru', 'vk.com', 'vkvideo.ru']);
const EMBED_ALLOW = 'fullscreen; picture-in-picture; encrypted-media';
const STRIP_FROM = 6; // this many vertical films and more get a strip of covers instead of text tabs
const BUFFER_AHEAD_S = 30; // hls.js keeps this much ahead instead of the whole film
const DISK_START_MS = 30000; // a Disk film without its first frame this long after the press: the message
const DISK_STALL_MS = 15000; // a started Disk film gets no bytes this long: a fresh link
const DISK_RETRIES = 2; // fresh Disk links per film before the message
const TELEGRAM_URL = 'https://t.me/imglebsmirnov';

const TEXT = Object.freeze({
  start: 'Смотреть',
  error: 'Видео не загрузилось. Обновите страницу или напишите Глебу:',
  telegram: 'Telegram @imglebsmirnov',
  diskError: 'Видео с Яндекс Диска не загрузилось.',
  openDisk: 'Открыть на Яндекс Диске',
  quality: 'Качество',
  qualityGroup: 'Качество видео',
  auto: 'Авто',
  tabs: 'Выбор видео',
  stage: 'Видео',
  separator: ' · ',
  pauseLoop: 'Поставить видео на паузу',
  playLoop: 'Продолжить видео',
  loopAlt: ', кадр из ролика',
});

let libPromise = null;

/** Run fn once the browser is idle after the first paint, or after IDLE_ATTACH_MS at the latest. */
function whenIdle(fn) {
  if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: IDLE_ATTACH_MS });
  else window.setTimeout(fn, IDLE_ATTACH_MS);
}

/** hls.js, loaded once on first need; later calls reuse the same promise. */
function loadLib() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HLS_LIB;
      script.async = true;
      script.onload = () => (window.Hls ? resolve(window.Hls) : reject(new Error('hls.js loaded without Hls')));
      script.onerror = () => {
        libPromise = null;
        reject(new Error('hls.js failed to load'));
      };
      document.head.append(script);
    });
  }
  return libPromise;
}

/** Safari and every browser on iOS play HLS themselves; elsewhere hls.js does it through MSE. */
function prefersNative(video) {
  if (video.canPlayType(HLS_TYPE) === '') return false;
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|chromium|crios|fxios|edg|opr|android).)*safari/i.test(ua);
  return iOS || safari;
}

/** Only https players of RuTube and VK go into the iframe; anything else is ignored with a warning. */
export function safeEmbed(src) {
  const value = String(src || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    const known = EMBED_HOSTS.some((name) => host === name || host.endsWith('.' + name));
    if (url.protocol === 'https:' && known) return url.href;
  } catch (error) {
    // not a URL: falls through to the warning
  }
  console.warn('[portfolio] embed skipped, only https players of RuTube or VK:', value);
  return '';
}

/** What the stage can show for a work, in tab order: the embed first, then our own films. */
function sourcesOf(work) {
  const own = work.films.map((film) => Object.freeze({ type: film.ydisk ? 'disk' : 'hls', film }));
  const embed = safeEmbed(work.embed);
  if (!embed) return own;
  const full = Object.freeze({ type: 'embed', src: embed, label: work.embedLabel || 'Полная версия', duration: work.embedDuration || '' });
  return [full].concat(own);
}

function labelOf(source) {
  const item = source.type === 'embed' ? source : source.film;
  return item.duration ? item.label + TEXT.separator + item.duration : item.label;
}

function ratioOf(source) {
  const [w, hgt] = (source.type === 'embed' ? '16/9' : source.film.ratio).split('/').map(Number);
  return { w, h: hgt };
}

function filmPoster(work, film) {
  if (film.poster) return mediaPath(work.slug, film.poster);
  return mediaPath(work.slug, window.innerWidth < NARROW_POSTER_PX ? 'poster-960' : 'poster');
}

/** Short side of a rendition: 1080 for 1920×1080 and for 1080×1920 alike, as the folder names. */
function shortSide(level) {
  return Math.min(level.width || 0, level.height || 0) || level.height || 0;
}

// ---------- HLS ----------

/** «Авто» starts on the lightest rung: its first segment is shown as it arrives, ABR climbs from there. */
function startIndex(index) {
  return index === -1 ? 0 : index;
}

function watchErrors(Hls, hls, master, onFail) {
  const manifestErrors = [Hls.ErrorDetails.MANIFEST_LOAD_ERROR, Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT, Hls.ErrorDetails.MANIFEST_PARSING_ERROR];
  let recoveries = 0;
  hls.on(Hls.Events.ERROR, (event, data) => {
    if (!data.fatal) return;
    recoveries += 1;
    if (recoveries > MAX_RECOVERIES) {
      hls.destroy();
      onFail(new Error('HLS ' + data.type + ': ' + data.details));
    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      hls.recoverMediaError();
    } else if (manifestErrors.includes(data.details)) {
      hls.loadSource(master); // startLoad() never asks for the master playlist again
    } else {
      hls.startLoad();
    }
  });
}

/**
 * One film on one <video>. Nothing but the playlists loads until start().
 * @returns {{ start: () => void, setQuality: (q: 'auto'|number) => void, destroy: () => void }}
 */
function createStream(video, base, opts) {
  const master = base + 'master.m3u8';
  const state = { mode: '', hls: null, levels: new Map(), started: false, destroyed: false, quality: opts.quality, ready: null, failed: false };

  const fail = (error) => {
    if (state.failed || state.destroyed) return;
    state.failed = true;
    console.warn('[portfolio] video failed:', error && error.message);
    opts.onFail();
  };
  video.addEventListener('error', () => {
    if (!state.destroyed && video.error) fail(new Error('video error ' + video.error.code));
  });

  function nativeUrl(quality) {
    return quality === 'auto' ? master : base + quality + '/index.m3u8';
  }

  /** hls.js level index for the chosen quality: -1 is automatic, undefined is not known yet. */
  function levelIndex() {
    return state.quality === 'auto' ? -1 : state.levels.get(state.quality);
  }

  function applyQuality() {
    if (state.mode === 'hls') {
      if (!state.hls || !state.levels.size) return; // MANIFEST_PARSED applies it later
      const index = levelIndex();
      if (index === undefined) return;
      if (!state.started) {
        state.hls.startLevel = startIndex(index);
        return;
      }
      if (state.hls.manualLevel === index) return;
      // Back to auto, or keeping the level that already plays: from the next fragment, nothing refetched.
      // Another level: switch now, as the visitor expects after a click.
      if (index === -1 || index === state.hls.currentLevel) state.hls.loadLevel = index;
      else state.hls.currentLevel = index;
      return;
    }
    if (state.mode !== 'native') return;
    const url = new URL(nativeUrl(state.quality), document.baseURI).href;
    if (video.currentSrc === url || video.src === url) return;
    const time = video.currentTime;
    const resume = state.started && !video.paused && !video.ended;
    if (state.started) {
      video.addEventListener('loadedmetadata', () => {
        if (time > 0) video.currentTime = time;
        if (resume) tryPlay(video);
      }, { once: true });
    }
    video.src = url; // a new src starts loading by itself (nothing before the start: preload is none)
  }

  function attach() {
    if (state.ready) return state.ready;
    if (prefersNative(video)) {
      state.mode = 'native';
      state.ready = Promise.resolve();
      applyQuality();
      return state.ready;
    }
    state.mode = 'hls';
    state.ready = loadLib().then((Hls) => {
      if (state.destroyed) return;
      if (!Hls.isSupported()) {
        if (video.canPlayType(HLS_TYPE) === '') throw new Error('HLS is not supported here');
        state.mode = 'native';
        applyQuality();
        return;
      }
      const hls = new Hls({ autoStartLoad: false, capLevelToPlayerSize: true, maxMaxBufferLength: BUFFER_AHEAD_S });
      state.hls = hls;
      watchErrors(Hls, hls, master, fail);
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        data.levels.forEach((level, index) => state.levels.set(shortSide(level), index));
        if (state.started) begin();
        else applyQuality();
      });
      hls.loadSource(master);
      hls.attachMedia(video);
    });
    state.ready.catch(fail);
    return state.ready;
  }

  /** hls.js after the start: load from the chosen level and keep it if it was picked by hand. */
  function begin() {
    const index = levelIndex();
    if (index !== undefined) state.hls.startLevel = startIndex(index);
    state.hls.startLoad();
    if (index !== undefined && index !== -1) state.hls.loadLevel = index;
    tryPlay(video);
  }

  whenIdle(() => {
    if (!state.destroyed) attach();
  });

  return Object.freeze({
    start() {
      state.started = true;
      video.preload = 'auto';
      const ready = attach();
      // Safari counts only a play() inside the click as the visitor's own: call it right away there.
      if (state.mode === 'native') {
        tryPlay(video);
        return;
      }
      ready.then(() => {
        if (state.destroyed) return;
        if (state.mode === 'native') tryPlay(video); // no MSE here, hls.js stepped aside
        else if (state.hls && state.levels.size) begin(); // otherwise MANIFEST_PARSED calls begin()
      }, () => {});
    },
    setQuality(quality) {
      state.quality = quality;
      if (state.ready) applyQuality();
    },
    suspend() {
      if (state.hls) state.hls.stopLoad();
    },
    resume() {
      if (state.hls && state.started) state.hls.startLoad();
    },
    destroy() {
      state.destroyed = true;
      video.pause();
      if (state.hls) state.hls.destroy();
      state.hls = null;
      video.removeAttribute('src');
      video.load();
    },
  });
}

// ---------- views ----------

function filmView(work, film, ctx) {
  const video = h('video', {
    class: 'player__video',
    playsinline: true,
    'webkit-playsinline': true,
    preload: 'none',
    poster: filmPoster(work, film),
    'aria-label': plain(work.title) + TEXT.separator + film.label,
  });
  // Laid out like the Disk message below: the text, then a link the visitor can press.
  const error = h('p', { class: 'player__error', role: 'alert', hidden: true }, [
    h('span', null, typo(TEXT.error)),
    h('a', { class: 'player__error-link', href: TELEGRAM_URL, rel: 'noopener' }, TEXT.telegram),
  ]);
  const button = startButton({ type: 'hls', film });

  const stream = createStream(video, mediaPath(work.slug, film.id + '/', ''), {
    quality: ctx.quality(),
    onFail: () => {
      error.hidden = false;
      button.hidden = true;
    },
  });
  const start = (keepFocus) => {
    ctx.engage();
    button.hidden = true;
    video.controls = true;
    stream.start();
    if (keepFocus !== true) video.focus({ preventScroll: true }); // a switch leaves the focus on the tab or cover
  };
  button.addEventListener('click', start);
  return { nodes: [video, button, error], stream, start, destroy: () => stream.destroy() };
}

function startButton(source) {
  return h('button', { type: 'button', class: 'player__start', 'aria-label': TEXT.start + ': ' + labelOf(source) },
    h('span', { class: 'player__start-icon' }, icon('play')));
}

/**
 * A film from the Yandex Disk folder: the link is asked for ahead, after first paint, so that a click
 * can start the film inside the gesture (Safari); an expired link is asked for once more.
 */
function diskView(work, film, ctx) {
  const video = h('video', {
    class: 'player__video',
    playsinline: true,
    'webkit-playsinline': true,
    preload: 'none',
    poster: filmPoster(work, film),
    'aria-label': plain(work.title) + TEXT.separator + film.label,
  });
  const error = h('p', { class: 'player__error', role: 'alert', hidden: true }, [
    h('span', null, typo(TEXT.diskError)),
    h('a', { class: 'player__error-link', href: diskPage(film.ydisk), target: '_blank', rel: 'noopener' }, typo(TEXT.openDisk)),
  ]);
  const button = startButton({ type: 'disk', film });
  const file = diskFile(film.ydisk);
  const state = { started: false, retries: 0, destroyed: false, timer: 0 };

  const disarm = () => {
    window.clearTimeout(state.timer);
    state.timer = 0;
  };
  const fail = (reason) => {
    if (state.destroyed) return;
    disarm();
    console.warn('[portfolio] Disk film failed:', reason && reason.message ? reason.message : reason);
    video.pause();
    video.removeAttribute('src'); // stop the browser asking a broken Disk again and again
    video.load();
    video.controls = false;
    button.hidden = true;
    error.hidden = false;
  };
  const play = (href) => {
    if (state.destroyed) return;
    video.src = href;
    const attempt = video.play();
    // Safari refuses play() outside the press (the link came later): give the visitor the button back.
    if (attempt && attempt.catch) {
      attempt.catch((reason) => {
        if (state.destroyed || !reason || reason.name !== 'NotAllowedError') return; // other failures go through 'error'
        disarm();
        button.hidden = false;
        video.controls = false;
      });
    }
  };
  const recover = (reason) => {
    if (!state.started || state.destroyed) return;
    if (state.retries >= DISK_RETRIES) {
      fail(reason);
      return;
    }
    state.retries += 1;
    const time = video.currentTime;
    file.get(true).then((href) => {
      video.addEventListener('loadedmetadata', () => {
        if (time > 0) video.currentTime = time;
      }, { once: true });
      play(href);
      arm(); // a new link starts from nothing: the start deadline again
    }, fail);
  };
  // Before the first frame the browser reports no bytes (a long episode first loads 3 to 4 MB of index):
  // one generous deadline. After it, a stall without new bytes means the Disk is stuck, not slow.
  const arm = () => {
    disarm();
    if (video.readyState === 0) state.timer = window.setTimeout(() => fail(new Error('Disk film did not start')), DISK_START_MS);
    else state.timer = window.setTimeout(() => recover(new Error('Disk film stalled')), DISK_STALL_MS);
  };
  whenIdle(() => {
    if (!state.destroyed) file.get().catch(() => {}); // a failure shows up only if the visitor presses play
  });
  const start = (keepFocus) => {
    ctx.engage();
    state.started = true;
    button.hidden = true;
    video.controls = true;
    video.preload = 'auto';
    const href = file.fresh();
    if (href) play(href);
    else file.get().then(play, fail);
    arm();
    if (keepFocus !== true) video.focus({ preventScroll: true });
  };
  button.addEventListener('click', start);
  video.addEventListener('waiting', () => { if (state.started && video.readyState > 0) arm(); });
  video.addEventListener('progress', () => { if (state.timer && video.readyState > 0) arm(); }); // bytes come: slow, not stuck
  video.addEventListener('loadedmetadata', disarm);
  video.addEventListener('playing', disarm);
  video.addEventListener('pause', disarm);
  video.addEventListener('error', () => recover(new Error('video error ' + (video.error ? video.error.code : ''))));
  const destroy = () => {
    state.destroyed = true;
    disarm();
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
  return { nodes: [video, button, error], stream: null, start, destroy };
}

function embedView(work, source) {
  const frame = h('iframe', {
    class: 'player__embed',
    src: source.src,
    title: plain(work.title) + TEXT.separator + source.label,
    allow: EMBED_ALLOW,
    allowfullscreen: true,
    referrerpolicy: 'strict-origin-when-cross-origin',
  });
  return { nodes: [frame], stream: null, destroy: () => frame.remove() };
}

function segmented(className, label, items, onPick) {
  const group = h('div', { class: 'seg ' + className, role: 'group', 'aria-label': label });
  items.forEach((item) => {
    const button = h('button', { type: 'button', class: 'seg__item', 'aria-pressed': 'false', 'data-value': String(item.value) }, typo(item.text));
    button.addEventListener('click', () => onPick(item.value));
    group.append(button);
  });
  return group;
}

function press(group, value) {
  if (!group) return;
  group.querySelectorAll('button[data-value]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.value === String(value)));
  });
}

/** Many vertical films: a row of small covers (scrolls sideways on phones), the label goes in the caption. */
function coverStrip(work, sources, onPick) {
  const group = h('div', { class: 'reels', role: 'group', 'aria-label': TEXT.tabs });
  sources.forEach((source, index) => {
    const thumb = h('span', { class: 'reels__thumb' });
    thumb.append(picture({
      src: mediaPath(work.slug, (source.film.poster || 'poster-v') + '-s'),
      alt: '',
      width: 96,
      height: 170,
      box: thumb,
    }));
    const button = h('button', { type: 'button', class: 'reels__item', 'aria-pressed': 'false', 'data-value': String(index), 'aria-label': labelOf(source) }, thumb);
    button.addEventListener('click', () => onPick(index));
    group.append(button);
  });
  return group;
}

/** Bring the chosen cover into the middle of the strip without moving the page. */
function centreCover(strip, index) {
  const button = strip.querySelector('button[data-value="' + index + '"]');
  if (!button || strip.scrollWidth <= strip.clientWidth) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  strip.scrollTo({ left: button.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2, behavior: calm ? 'auto' : 'smooth' });
}

/** The quality switch for one film: «Авто» plus each rendition, best first; none for a single one. */
function qualityItems(film) {
  const levels = [...film.levels].sort((a, b) => b - a);
  return [{ value: 'auto', text: TEXT.auto }].concat(levels.map((level) => ({ value: level, text: level + 'p' })));
}

/**
 * Build the stage for a work into container.
 * @param {HTMLElement} container
 * @param {import('./works.js').Work} work
 */
export function mountStage(container, work) {
  const sources = sourcesOf(work);
  if (!sources.length) {
    mountLoop(container, work);
    return;
  }
  const player = h('div', { class: 'player', style: 'view-transition-name: work-' + work.slug });
  const inner = h('div', { class: 'stage__inner' }, player);
  const left = h('div', { class: 'player-bar__main' });
  const right = h('div', { class: 'player-bar__side' });
  const bar = h('div', { class: 'player-bar' }, [left, right]);
  inner.append(bar);
  container.append(inner);

  const state = { index: -1, view: null, quality: 'auto', qualityGroup: null, tabs: null, strip: null, caption: null, engaged: false };
  const ctx = { quality: () => state.quality, engage: () => { state.engaged = true; } };
  player.addEventListener('keydown', (event) => onFilmKey(event, player));
  window.addEventListener('pagehide', () => { if (state.view && state.view.stream) state.view.stream.suspend(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted && state.view && state.view.stream) state.view.stream.resume(); });
  const vertical = sources.every((source) => source.type !== 'embed' && source.film.ratio === '9/16');

  if (sources.length >= STRIP_FROM && vertical) {
    state.strip = coverStrip(work, sources, (index) => show(index));
    bar.prepend(state.strip);
    state.caption = h('p', { class: 'player-bar__caption', 'aria-live': 'polite' });
    left.append(state.caption);
  } else if (sources.length > 1) {
    state.tabs = segmented('seg--tabs', TEXT.tabs, sources.map((source, index) => ({ value: index, text: labelOf(source) })), (index) => show(index));
    left.append(state.tabs);
  } else {
    state.caption = h('p', { class: 'player-bar__caption' });
    left.append(state.caption);
  }

  function renderQuality(source) {
    right.replaceChildren();
    state.qualityGroup = null;
    if (source.type !== 'hls' || source.film.levels.length < 2) return;
    state.qualityGroup = segmented('seg--quality', TEXT.qualityGroup, qualityItems(source.film), (value) => {
      state.quality = value;
      press(state.qualityGroup, value);
      if (state.view && state.view.stream) state.view.stream.setQuality(value);
    });
    right.append(h('span', { class: 'player-bar__label', 'aria-hidden': 'true' }, TEXT.quality), state.qualityGroup);
    press(state.qualityGroup, state.quality);
  }

  function show(index) {
    if (index === state.index) return;
    const first = !state.view;
    if (state.view) state.view.destroy();
    state.index = index;
    const source = sources[index];
    // A quality picked for another version that this one does not have: back to auto.
    if (source.type === 'hls' && state.quality !== 'auto' && !source.film.levels.includes(state.quality)) state.quality = 'auto';
    const ratio = ratioOf(source);
    inner.style.setProperty('--arw', String(ratio.w));
    inner.style.setProperty('--arh', String(ratio.h));
    inner.classList.toggle('is-vertical', ratio.h > ratio.w);
    if (source.type === 'embed') state.view = embedView(work, source);
    else if (source.type === 'disk') state.view = diskView(work, source.film, ctx);
    else state.view = filmView(work, source.film, ctx);
    player.replaceChildren(...state.view.nodes);
    press(state.tabs || state.strip, index);
    if (state.caption) state.caption.textContent = typo(labelOf(source));
    if (state.strip && !first) centreCover(state.strip, index);
    renderQuality(source);
    // The visitor already watches: the version they picked starts at once, inside the same press.
    if (state.engaged && state.view.start) state.view.start(true);
  }

  show(0);
}

/** YouTube keys on a started film, on any keyboard layout: F full screen, M sound, K pause. */
function onFilmKey(event, player) {
  const video = player.querySelector('.player__video');
  if (!video || !video.controls || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'KeyF') {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  } else if (event.code === 'KeyM') video.muted = !video.muted;
  else if (event.code === 'KeyK') { if (video.paused) tryPlay(video); else video.pause(); }
  else return;
  event.preventDefault();
}

/** One button that stops and restarts the loop: moving content that starts by itself needs a way to stop it (WCAG 2.2.2). */
function pauseToggle(onChange) {
  const button = h('button', { type: 'button', class: 'player__pause', 'aria-label': TEXT.pauseLoop }, icon('pause'));
  let paused = false;
  button.addEventListener('click', () => {
    paused = !paused;
    button.setAttribute('aria-label', paused ? TEXT.playLoop : TEXT.pauseLoop);
    button.firstChild.replaceWith(icon(paused ? 'play' : 'pause'));
    onChange(paused);
  });
  return button;
}

/** A work without a film: its silent loop over the poster, a pause button, paused off screen. */
function mountLoop(container, work) {
  const player = h('div', { class: 'player player--loop', style: 'view-transition-name: work-' + work.slug });
  player.append(picture({
    src: mediaPath(work.slug, 'poster'),
    srcset: mediaPath(work.slug, 'poster-960') + ' 960w, ' + mediaPath(work.slug, 'poster') + ' 1920w',
    sizes: '100vw',
    alt: plain(work.title) + TEXT.loopAlt,
    width: 1920,
    height: 1080,
    eager: true,
    box: player,
  }));
  container.append(h('div', { class: 'stage__inner stage__inner--loop' }, player));
  if (calmMode() || typeof IntersectionObserver !== 'function') return;

  const video = silentLoop('player__loop');
  video.src = mediaPath(work.slug, 'loop', '.mp4');
  video.preload = 'auto';
  const state = { paused: false, visible: false };
  const sync = () => (state.visible && !state.paused ? tryPlay(video) : video.pause());
  const toggle = pauseToggle((paused) => {
    state.paused = paused;
    sync();
  });
  video.addEventListener('playing', () => video.classList.add('is-on'), { once: true });
  video.addEventListener('error', () => {
    video.remove();
    toggle.remove();
  }, { once: true });
  player.append(video, toggle);
  new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      state.visible = entry.isIntersecting;
    });
    sync();
  }, { threshold: 0.25 }).observe(player);
}
