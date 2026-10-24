// Lead form for the contact section. It renders into <div id="lead-form"></div>, checks the
// fields, posts them to the Apps Script web app (backend/Code.gs) and says what happened.
// Until ENDPOINT is set in lead-config.js the fields stay inactive and the visitor gets Gleb's
// Telegram and phone in place of the submit button: the form never pretends to send.
// The pure helpers are exported for the Node tests in backend/test.
//
// Portfolio copy: the same file as js/lead-form.js on wearesalut.com (23.10.2026) with these changes.
// The portfolio has pages in works/, so the policy link is resolved from this file's own address
// (from assets/js/ up to the site root) instead of the page's. The message placeholder and the
// rate-limit line are the portfolio's own (24.10), and a work page can preset the format (data-kind).

import { ENDPOINT, BOT_USERNAME } from './lead-config.js';

export const CONTACT = Object.freeze({ telegram: 'imglebsmirnov', phone: '+79104248144' });

const SLOT_ID = 'lead-form';
const POLICY_URL = new URL('../../privacy.html', import.meta.url).href;
const LIMITS = Object.freeze({
  nameMax: 80,
  nickInputMax: 64,
  phoneInputMax: 32,
  phoneDigitsMin: 8,
  phoneDigitsMax: 15, // E.164
  messageMax: 1000,
  counterFrom: 200, // the counter shows up when this many characters or fewer are left
  minElapsedMs: 3000, // the backend takes a faster form for a bot and drops it
  timeoutMs: 40000, // Apps Script can take 20 s and more on a cold start
});

const NICK_RE = /^[A-Za-z0-9_]{5,32}$/;
const NICK_LINK_RE = /^(?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.me\//i;
// The phone rules repeat normalizePhone in Code.gs; backend/test/flow.test.js keeps them equal.
const PHONE_CHARS_RE = /^\+?[\d\s().\u2010-\u2015-]+$/;
const RU_NATIONAL_RE = /^[3-9]\d{9}$/;
const RU_BARE_NATIONAL_RE = /^[349]\d{9}$/;
const RU_PHONE_PARTS_RE = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/;
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
const BOT_RE = /^[A-Za-z0-9_]{5,64}$/;
const LEAD_ID_RE = /^[A-HJ-NP-Z2-9]{5}$/; // the honeypot answer 00000 never matches
const SHORT_WORD_RE = /^(?:[«„(]?[А-Яа-яЁёA-Za-z]{1,2}|\+?\d+)$/; // «+7» and «900» hold on to the next word too
const DIGIT_HYPHEN_RE = /(\d)-(?=\d)/g; // «123-45-67»: only used in replace
const NBSP = '\u00A0';
const NB_HYPHEN = '\u2011';

export const FORMATS = Object.freeze([
  Object.freeze({ value: 'studio', label: 'Студийная съёмка' }),
  Object.freeze({ value: 'reels', label: 'Рилсы на iPhone' }),
  Object.freeze({ value: 'smm', label: 'Ведение соцсетей' }),
  Object.freeze({ value: 'avatar', label: 'ИИ-аватар' }),
  Object.freeze({ value: 'other', label: 'Другое' }),
]);

// Fields in screen order; the first one with an error gets the focus.
const FIELD_ORDER = Object.freeze(['name', 'contact', 'telegram', 'phone', 'kind', 'message', 'consent']);
// Which inputs an error marks as invalid, and which input it focuses.
const INPUT_ERRORS = Object.freeze({
  name: ['name'],
  telegram: ['telegram', 'contact'],
  phone: ['phone', 'contact'],
  kind: ['kind'],
  message: ['message'],
  consent: ['consent'],
});
const FOCUS_FOR = Object.freeze({ contact: 'telegram' });

// All visible texts. The visitor is «вы», Gleb is «он». No long dashes or arrows.
export const TEXT = Object.freeze({
  name: 'Как вас зовут',
  contactLegend: 'Как с вами связаться',
  contactHint: 'Хватит одного: ника в Telegram или телефона.',
  telegram: 'Ник в Telegram',
  telegramPlaceholder: '@username',
  phone: 'Телефон',
  phonePlaceholder: '+7 900 123-45-67',
  kind: 'Формат',
  kindPlaceholder: 'Выберите формат',
  message: 'Пара слов о задаче',
  optional: 'необязательно',
  messagePlaceholder: 'Например: интервью в студии для YouTube-канала, к концу месяца',
  counter: 'Осталось знаков:',
  consent: 'Соглашаюсь на обработку персональных данных',
  policy: 'Политика обработки персональных данных',
  newTab: ' (откроется в новой вкладке)',
  honeypot: 'Это поле заполнять не нужно',
  submit: 'Отправить заявку',
  sending: 'Отправляем…',
  sendingStatus: 'Отправляем заявку…',
  direct: 'Удобнее без формы?',
  directTelegram: 'Telegram',
  or: 'или',
  offline: 'Форма пока не принимает заявки. Напишите Глебу напрямую:',
  successTitle: 'Заявка у нас, номер',
  successBot: 'Откройте бота в Telegram: он подтвердит заявку, и Глеб ответит вам там же.',
  successNick: 'Глеб напишет вам в Telegram:',
  successPhone: 'Глеб позвонит или напишет на номер',
  successFix: 'Ошиблись в контакте? Напишите Глебу напрямую:',
  openBot: 'Открыть бота',
  errors: Object.freeze({
    name: 'Напишите, как вас зовут.',
    contact: 'Оставьте ник в Telegram или телефон.',
    telegram: 'Проверьте ник: латиница, цифры и подчёркивание, от 5 до 32 знаков.',
    phone: 'Проверьте номер, например +7 900 123-45-67. Номер другой страны начните с +.',
    kind: 'Выберите формат.',
    message: 'Сократите текст до 1000 знаков.',
    consent: 'Отметьте согласие на обработку персональных данных.',
  }),
  status: Object.freeze({
    rate: 'Форма временно не принимает заявки. Напишите Глебу напрямую:',
    server: 'Заявка не сохранилась из-за ошибки на сервере. Напишите Глебу напрямую:',
    network: 'Заявка не ушла: нет связи с сервером. Проверьте интернет и отправьте ещё раз или напишите Глебу напрямую:',
    timeout: 'Сервер не ответил вовремя, и мы не знаем, дошла ли заявка. Чтобы она не потерялась, напишите Глебу напрямую:',
    unreadable: 'Не получилось отправить заявку. Напишите Глебу напрямую:',
  }),
});

// ---------- Pure helpers ----------

function cleanLine(value) {
  return String(value === null || value === undefined ? '' : value).replace(CONTROL_CHARS_RE, '').replace(/\s+/g, ' ').trim();
}

/**
 * Non-breaking space after one- and two-letter words and after numbers, as the site's HTML does,
 * and non-breaking hyphens inside numbers, so a phone in the copy stays on one line.
 */
export function typo(text) {
  const words = String(text).split(' ');
  return words.reduce((out, word, index) => {
    if (index === 0) return word;
    return out + (SHORT_WORD_RE.test(words[index - 1]) ? NBSP : ' ') + word;
  }, '').replace(DIGIT_HYPHEN_RE, '$1' + NB_HYPHEN);
}

/** «anna_k» out of «@anna_k», «t.me/anna_k» or «https://t.me/anna_k/». Anything else is left to the check. */
export function normalizeNick(value) {
  return cleanLine(value).replace(NICK_LINK_RE, '').replace(/\/+$/, '').replace(/^@/, '');
}

/** 10 digits after +7 when the input looks like a Russian number, otherwise null. */
function russianNationalPart(digits, plus) {
  if (plus) return digits.charAt(0) === '7' ? digits.slice(1) : null;
  if (digits.length === 11 && (digits.charAt(0) === '7' || digits.charAt(0) === '8')) return digits.slice(1);
  if (digits.length === 10 && RU_BARE_NATIONAL_RE.test(digits)) return digits;
  return null;
}

/**
 * +7XXXXXXXXXX for Russian notations, +<country code><number> for the rest.
 * @returns {string|null} '' for an empty field, null when it is not a phone number
 */
export function normalizePhone(value) {
  const raw = cleanLine(value);
  if (!raw) return '';
  if (raw.length > LIMITS.phoneInputMax || !PHONE_CHARS_RE.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  const plus = raw.charAt(0) === '+';
  const national = russianNationalPart(digits, plus);
  if (national !== null) return RU_NATIONAL_RE.test(national) ? '+7' + national : null;
  if (!plus || digits.length < LIMITS.phoneDigitsMin || digits.length > LIMITS.phoneDigitsMax) return null;
  return '+' + digits;
}

/** «+7 910 424-81-44» out of «+79104248144»; a foreign number stays as it is. */
export function formatPhone(phone) {
  const text = String(phone === null || phone === undefined ? '' : phone);
  const parts = RU_PHONE_PARTS_RE.exec(text);
  return parts ? '+7 ' + parts[1] + ' ' + parts[2] + '-' + parts[3] + '-' + parts[4] : text;
}

/**
 * Typed values made ready for the check and the request.
 * @param {{name?: string, telegram?: string, phone?: string, kind?: string, message?: string, consent?: boolean, hp?: string}} raw
 */
export function cleanValues(raw) {
  const source = raw || {};
  return Object.freeze({
    name: cleanLine(source.name),
    telegram: normalizeNick(source.telegram),
    phone: normalizePhone(source.phone),
    kind: String(source.kind || ''),
    message: String(source.message === null || source.message === undefined ? '' : source.message).trim(),
    consent: Boolean(source.consent),
    hp: String(source.hp || ''),
  });
}

/** Fields with an error, as {field: true}; the same rules as validateLead in Code.gs. */
export function findErrors(values) {
  const checks = [
    ['name', !values.name || values.name.length > LIMITS.nameMax],
    ['telegram', values.telegram !== '' && !NICK_RE.test(values.telegram)],
    ['phone', values.phone === null],
    ['contact', values.telegram === '' && values.phone === ''],
    ['kind', !FORMATS.some((format) => format.value === values.kind)],
    ['message', values.message.length > LIMITS.messageMax],
    ['consent', !values.consent],
  ];
  return Object.freeze(Object.fromEntries(checks.filter((check) => check[1]).map((check) => [check[0], true])));
}

/** The POST body. URLSearchParams keeps it a simple request: no preflight, which Apps Script cannot answer. */
export function buildBody(values, elapsedMs, page) {
  return new URLSearchParams({
    name: values.name,
    telegram: values.telegram,
    phone: values.phone || '',
    kind: values.kind,
    message: values.message,
    consent: values.consent ? '1' : '',
    hp: values.hp,
    elapsed: String(Math.round(elapsedMs)),
    page: String(page || ''),
  });
}

/** t.me link that opens the bot with the lead number, or '' when the name or number looks wrong. */
export function botLink(serverBot, id, configBot = BOT_USERNAME) {
  const fromServer = String(serverBot || '').trim().replace(/^@/, '');
  const fromConfig = String(configBot || '').trim().replace(/^@/, '');
  const name = BOT_RE.test(fromServer) ? fromServer : fromConfig;
  return BOT_RE.test(name) && LEAD_ID_RE.test(String(id)) ? 'https://t.me/' + name + '?start=' + id : '';
}

/**
 * What the server answer means for the visitor.
 * @returns {{type: 'success', id: string, bot: string}|{type: 'field', field: string}|{type: 'rate'|'server'|'unreadable'}}
 */
export function readResult(data, values) {
  if (!data || typeof data !== 'object') return { type: 'unreadable' };
  if (data.ok === true) {
    const id = String(data.id === null || data.id === undefined ? '' : data.id);
    if (!LEAD_ID_RE.test(id)) return { type: 'unreadable' };
    return { type: 'success', id, bot: values.telegram ? botLink(data.bot, id) : '' };
  }
  if (data.error === 'validation' && FIELD_ORDER.includes(data.field)) return { type: 'field', field: data.field };
  if (data.error === 'rate' || data.error === 'server') return { type: data.error };
  return { type: 'unreadable' };
}

// ---------- DOM ----------

const fieldId = (name) => 'lf-' + name;
const errorId = (name) => 'lf-' + name + '-error';

/** An element with attributes and children; text goes in as text, never as HTML. */
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'text') node.textContent = typo(value);
    else node.setAttribute(key, value === true ? '' : String(value));
  });
  [].concat(children === undefined ? [] : children).forEach((child) => {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  });
  return node;
}

/** Pixel chevron for the select, drawn like the sun and moon of the theme switch. */
function chevron() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const path = document.createElementNS(ns, 'path');
  svg.setAttribute('class', 'lead-form__chevron');
  svg.setAttribute('viewBox', '0 0 7 4');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', 'M0 0h1v1H0zM6 0h1v1H6zM1 1h1v1H1zM5 1h1v1H5zM2 2h1v1H2zM4 2h1v1H4zM3 3h1v1H3z');
  svg.append(path);
  return svg;
}

const errorSlot = (name) => el('p', { class: 'lead-form__error', id: errorId(name), hidden: true });

function inputField(name, label, attrs, labelClass) {
  return el('div', { class: 'lead-form__field' }, [
    el('label', { class: labelClass || 'lead-form__label', for: fieldId(name), text: label }),
    el('input', { class: 'lead-form__input', id: fieldId(name), name, ...attrs }),
    errorSlot(name),
  ]);
}

function contactGroup() {
  const describedBy = (name) => [fieldId('contact-hint'), errorId(name), errorId('contact')].join(' ');
  const shared = { autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'next' };
  return el('fieldset', { class: 'lead-form__group' }, [
    el('legend', { class: 'lead-form__label', text: TEXT.contactLegend }),
    el('p', { class: 'lead-form__hint', id: fieldId('contact-hint'), text: TEXT.contactHint }),
    el('div', { class: 'lead-form__pair' }, [
      inputField('telegram', TEXT.telegram, {
        ...shared,
        type: 'text',
        placeholder: TEXT.telegramPlaceholder,
        maxlength: LIMITS.nickInputMax,
        autocomplete: 'off',
        autocapitalize: 'none',
        'aria-describedby': describedBy('telegram'),
      }, 'lead-form__sublabel'),
      inputField('phone', TEXT.phone, {
        ...shared,
        type: 'tel',
        inputmode: 'tel',
        placeholder: TEXT.phonePlaceholder,
        maxlength: LIMITS.phoneInputMax,
        autocomplete: 'tel',
        'aria-describedby': describedBy('phone'),
      }, 'lead-form__sublabel'),
    ]),
    errorSlot('contact'),
  ]);
}

/** @param {string} preset a FORMATS value chosen in advance (a work page about studio shooting), or '' */
function kindField(preset) {
  return el('div', { class: 'lead-form__field' }, [
    el('label', { class: 'lead-form__label', for: fieldId('kind'), text: TEXT.kind }),
    el('div', { class: 'lead-form__select' }, [
      el('select', { class: 'lead-form__input', id: fieldId('kind'), name: 'kind', 'aria-required': 'true', 'aria-describedby': errorId('kind') }, [
        el('option', { value: '', disabled: true, selected: !preset, text: TEXT.kindPlaceholder }),
        ...FORMATS.map((format) => el('option', { value: format.value, selected: format.value === preset, text: format.label })),
      ]),
      chevron(),
    ]),
    errorSlot('kind'),
  ]);
}

function messageField() {
  return el('div', { class: 'lead-form__field' }, [
    el('label', { class: 'lead-form__label', for: fieldId('message') }, [
      typo(TEXT.message) + ' ',
      el('span', { class: 'lead-form__optional', text: TEXT.optional }),
    ]),
    el('textarea', {
      class: 'lead-form__input lead-form__textarea',
      id: fieldId('message'),
      name: 'message',
      rows: 4,
      maxlength: LIMITS.messageMax,
      placeholder: TEXT.messagePlaceholder,
      'aria-describedby': fieldId('message-count') + ' ' + errorId('message'),
    }),
    el('p', { class: 'lead-form__count', id: fieldId('message-count'), hidden: true }),
    errorSlot('message'),
  ]);
}

function consentField() {
  return el('div', { class: 'lead-form__consent' }, [
    el('div', { class: 'lead-form__check' }, [
      el('input', {
        class: 'lead-form__checkbox',
        id: fieldId('consent'),
        name: 'consent',
        type: 'checkbox',
        value: '1',
        'aria-required': 'true',
        'aria-describedby': fieldId('policy') + ' ' + errorId('consent'),
      }),
      el('label', { for: fieldId('consent'), text: TEXT.consent }),
    ]),
    // The link sits outside the label, so a tap on it opens the policy instead of ticking the box.
    // It opens in a new tab: what the visitor typed stays in the form.
    el('p', { class: 'lead-form__policy', id: fieldId('policy') },
      el('a', { class: 'lead-form__link', href: POLICY_URL, target: '_blank', rel: 'noopener' }, [
        typo(TEXT.policy),
        el('span', { class: 'visually-hidden', text: TEXT.newTab }),
      ])),
    errorSlot('consent'),
  ]);
}

function honeypot() {
  return el('div', { class: 'lead-form__hp', 'aria-hidden': 'true' }, [
    el('label', { for: fieldId('hp'), text: TEXT.honeypot }),
    el('input', { id: fieldId('hp'), name: 'hp', type: 'text', tabindex: '-1', autocomplete: 'off' }),
  ]);
}

// Contacts go in as plain text: the typography pass is for the copy, not for numbers and nicks.
const telegramLink = (className) => el('a', { class: className, href: 'https://t.me/' + CONTACT.telegram, rel: 'noopener' },
  TEXT.directTelegram + ' @' + CONTACT.telegram);
const phoneLink = (className) => el('a', { class: className, href: 'tel:' + CONTACT.phone }, formatPhone(CONTACT.phone));

/** «Telegram @imglebsmirnov или +7 910 424-81-44» as two links. */
function directLinks() {
  return [telegramLink('lead-form__link lead-form__nowrap'), ' ' + TEXT.or + ' ', phoneLink('lead-form__link lead-form__nowrap')];
}

function onlineFoot() {
  return el('div', { class: 'lead-form__foot' }, [
    el('button', { class: 'btn lead-form__submit', type: 'submit', text: TEXT.submit }),
    el('div', { class: 'lead-form__status', id: fieldId('status'), role: 'status' }),
    el('p', { class: 'lead-form__direct' }, [typo(TEXT.direct) + ' ', ...directLinks()]),
  ]);
}

function offlineFoot() {
  return el('div', { class: 'lead-form__offline' }, [
    el('p', { class: 'lead-form__offline-text', text: TEXT.offline }),
    el('div', { class: 'lead-form__actions' }, [
      telegramLink('btn lead-form__nowrap'),
      phoneLink('btn btn--ghost lead-form__nowrap'),
    ]),
  ]);
}

function buildForm(online, preset) {
  return el('form', { class: 'lead-form__form', novalidate: true, 'data-state': online ? 'ready' : 'offline' }, [
    el('div', { class: 'lead-form__fields' }, [nameField(), contactGroup(), kindField(preset), messageField(), consentField(), honeypot()]),
    online ? onlineFoot() : offlineFoot(),
  ]);
}

function nameField() {
  return inputField('name', TEXT.name, {
    type: 'text',
    maxlength: LIMITS.nameMax,
    autocomplete: 'name',
    autocapitalize: 'words',
    enterkeyhint: 'next',
    'aria-required': 'true',
    'aria-describedby': errorId('name'),
  });
}

const control = (form, name) => form.querySelector('#' + fieldId(name));

function readValues(form) {
  return cleanValues({
    name: control(form, 'name').value,
    telegram: control(form, 'telegram').value,
    phone: control(form, 'phone').value,
    kind: control(form, 'kind').value,
    message: control(form, 'message').value,
    consent: control(form, 'consent').checked,
    hp: control(form, 'hp').value,
  });
}

function paintErrors(form, errors) {
  FIELD_ORDER.forEach((field) => {
    const slot = form.querySelector('#' + errorId(field));
    const message = errors[field] ? typo(TEXT.errors[field]) : '';
    slot.textContent = message;
    slot.hidden = !message;
  });
  Object.entries(INPUT_ERRORS).forEach(([name, fields]) => {
    const input = control(form, name);
    if (fields.some((field) => errors[field])) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}

function focusFirstError(form, errors) {
  const first = FIELD_ORDER.find((field) => errors[field]);
  if (!first) return;
  const input = control(form, FOCUS_FOR[first] || first);
  input.focus({ preventScroll: true });
  input.closest('.lead-form__field, .lead-form__consent').scrollIntoView({ block: 'center' });
}

function showStatus(form, kind) {
  const status = control(form, 'status');
  const direct = form.querySelector('.lead-form__direct');
  const isError = Boolean(kind) && kind !== 'sending';
  status.className = 'lead-form__status' + (isError ? ' is-error' : '');
  direct.hidden = isError; // the error text carries the same links
  if (!kind) status.replaceChildren();
  else if (kind === 'sending') status.replaceChildren(el('p', { text: TEXT.sendingStatus }));
  else status.replaceChildren(el('p', null, [typo(TEXT.status[kind]) + ' ', ...directLinks(), '.']));
}

function setBusy(form, busy) {
  const button = form.querySelector('.lead-form__submit');
  // aria-disabled instead of disabled: the button keeps keyboard focus while the request runs.
  button.textContent = typo(busy ? TEXT.sending : TEXT.submit);
  button.setAttribute('aria-disabled', busy ? 'true' : 'false');
  if (busy) form.setAttribute('aria-busy', 'true');
  else form.removeAttribute('aria-busy');
  showStatus(form, busy ? 'sending' : '');
}

function successPanel(result, values) {
  const title = el('h3', { class: 'lead-form__done-title', tabindex: '-1' }, [
    typo(TEXT.successTitle) + NBSP, // «номер K7Q2M» stays on one line
    el('span', { class: 'lead-form__id' }, result.id),
    '.',
  ]);
  const contactLine = values.telegram
    ? [typo(TEXT.successNick) + ' ', el('span', { class: 'lead-form__nowrap' }, '@' + values.telegram), '.']
    : [typo(TEXT.successPhone) + ' ', el('span', { class: 'lead-form__nowrap' }, formatPhone(values.phone)), '.'];
  return el('div', { class: 'lead-form__done' }, [
    title,
    result.bot ? el('p', { class: 'lead-form__done-text', text: TEXT.successBot }) : el('p', { class: 'lead-form__done-text' }, contactLine),
    result.bot ? el('a', { class: 'btn', href: result.bot, target: '_blank', rel: 'noopener', text: TEXT.openBot }) : null,
    result.bot ? null : el('p', { class: 'lead-form__done-note' }, [typo(TEXT.successFix) + ' ', ...directLinks(), '.']),
  ]);
}

function showSuccess(slot, result, values) {
  const panel = successPanel(result, values);
  slot.replaceChildren(panel);
  const title = panel.querySelector('.lead-form__done-title');
  title.focus({ preventScroll: true });
  panel.scrollIntoView({ block: 'nearest' });
}

const delay = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

async function readJson(response) {
  try {
    return JSON.parse(await response.text());
  } catch (error) {
    return null; // a proxy page or Google's HTML error page: the visitor gets the direct contacts
  }
}

/** Posts the lead and reads the answer. Never throws: every failure becomes a result type. */
async function send(values, elapsed) {
  // A quick visitor waits out the rest of the 3 seconds; sent earlier, the lead would be dropped as a bot.
  const wait = LIMITS.minElapsedMs - elapsed();
  if (wait > 0) await delay(wait);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), LIMITS.timeoutMs);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      body: buildBody(values, elapsed(), window.location.href),
      redirect: 'follow', // Apps Script answers through a redirect to googleusercontent.com
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    const result = readResult(await readJson(response), values);
    if (result.type === 'unreadable') console.warn('[lead-form] unexpected answer, HTTP', response.status);
    return result;
  } catch (error) {
    const type = error && error.name === 'AbortError' ? 'timeout' : 'network';
    console.warn('[lead-form] request failed:', type, error && error.message);
    return { type };
  } finally {
    window.clearTimeout(timer);
  }
}

async function submit(form, slot, elapsed) {
  if (form.getAttribute('aria-busy') === 'true') return;
  const values = readValues(form);
  const errors = findErrors(values);
  form.dataset.attempted = 'true';
  paintErrors(form, errors);
  showStatus(form, '');
  if (Object.keys(errors).length) {
    focusFirstError(form, errors);
    return;
  }
  setBusy(form, true);
  const result = await send(values, elapsed);
  if (result.type === 'success') {
    form.dataset.sent = 'true';
    clearDraft();
    showSuccess(slot, result, values);
    return;
  }
  setBusy(form, false);
  if (result.type === 'field') {
    const fieldErrors = { [result.field]: true };
    paintErrors(form, fieldErrors);
    focusFirstError(form, fieldErrors);
    return;
  }
  showStatus(form, result.type);
}

function updateCounter(form) {
  const left = LIMITS.messageMax - control(form, 'message').value.length;
  const counter = control(form, 'message-count');
  const show = left <= LIMITS.counterFrom;
  counter.hidden = !show;
  counter.textContent = show ? TEXT.counter + ' ' + left : '';
}

// ---------- Draft: what is typed stays in this tab until it is sent or the tab is closed ----------

const DRAFT_KEY = 'salut-lead-draft';
const DRAFT_FIELDS = Object.freeze(['name', 'telegram', 'phone', 'kind', 'message']); // the consent tick is never kept

function readDraft() {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || 'null');
    return draft && typeof draft === 'object' ? draft : null;
  } catch (error) {
    return null; // storage blocked or the entry is damaged: an empty form
  }
}

function saveDraft(form) {
  if (form.dataset.sent === 'true') return; // the lead is gone: a late change event of the removed fields must not bring the draft back
  const draft = Object.fromEntries(DRAFT_FIELDS.map((name) => [name, control(form, name).value]));
  try {
    if (Object.values(draft).every((value) => value === '')) window.sessionStorage.removeItem(DRAFT_KEY);
    else window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    // storage blocked: the draft lives as long as this page
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    // nothing to clear
  }
}

/** Puts the saved draft back; a field the browser has already restored itself is left alone. */
function restoreDraft(form) {
  const draft = readDraft();
  if (!draft) return;
  DRAFT_FIELDS.forEach((name) => {
    const input = control(form, name);
    const saved = draft[name];
    if (typeof saved !== 'string') return;
    // The format the visitor chose beats the one a work page preset; other fields keep what the browser restored.
    const chosen = name === 'kind' ? FORMATS.some((format) => format.value === saved) : input.value === '';
    if (chosen) input.value = saved;
  });
  updateCounter(form);
}

/** Time since the form came into view: the backend reads anything under 3 seconds as a bot. */
function startTimer(form) {
  let shownAt = performance.now();
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      shownAt = performance.now();
      observer.disconnect();
    }, { threshold: 0.1 });
    observer.observe(form);
  }
  return () => performance.now() - shownAt;
}

function mountLeadForm(slot) {
  const online = String(ENDPOINT || '').trim() !== '';
  // A work page may name its format in data-kind (work.js sets it before this module runs).
  const preset = FORMATS.some((format) => format.value === slot.dataset.kind) ? slot.dataset.kind : '';
  const form = buildForm(online, preset);
  slot.classList.add('lead-form');
  slot.replaceChildren(form);
  if (!online) {
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      field.disabled = true;
    });
    return;
  }
  restoreDraft(form);
  const elapsed = startTimer(form);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(form, slot, elapsed);
  });
  const recheck = (event) => {
    if (event.target === control(form, 'message')) updateCounter(form);
    saveDraft(form);
    if (form.dataset.attempted === 'true') paintErrors(form, findErrors(readValues(form)));
  };
  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);
}

function autoMount() {
  const slot = document.getElementById(SLOT_ID);
  if (!slot || slot.dataset.mounted === 'true') return;
  slot.dataset.mounted = 'true';
  mountLeadForm(slot);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  else autoMount();
}
