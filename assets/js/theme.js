// Light and dark themes, as on wearesalut.com: the inline script in <head> sets data-theme before
// the first paint; this module runs the toggles and remembers the choice under the same key,
// so a visitor who picked a theme on the main site sees it here too (same origin only).

const STORAGE_KEY = 'salut-theme';
const THEME_COLOR = Object.freeze({ light: '#eeeae2', dark: '#151719' });
const LABEL = Object.freeze({ light: 'Включить тёмную тему', dark: 'Включить светлую тему' });

function readStored() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch (error) {
    return null;
  }
}

function store(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // Storage blocked (private window): the choice lasts until the page is closed.
  }
}

function current() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function apply(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', THEME_COLOR[theme]));
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.setAttribute('aria-label', LABEL[theme]);
    const text = button.querySelector('[data-theme-label]');
    if (text) text.textContent = LABEL[theme];
  });
}

export function initTheme() {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      store(next);
      apply(next);
    });
  });
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  system.addEventListener('change', (event) => {
    if (!readStored()) apply(event.matches ? 'dark' : 'light');
  });
  apply(current());
}
