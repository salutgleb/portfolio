// Работы портфолио SALUT. Один файл на всё: сетка на главной, страницы works/<slug>.html,
// плееры и подписи под ними берут данные отсюда. Разметку для правок трогать не нужно.
//
// Порядок в списке = порядок в «Предыдущая / Следующая»: сначала работы сетки 16:9, сильные первыми,
// потом вертикальные. В сетке и в ряду «Вертикальные ролики» работы идут в том же порядке.
// Тот же порядок в WORKS генератора оболочек make_pages.py.
// hidden: true убирает работу из сетки и листания.
// Новая работа: запись здесь, папка media/<slug>/ и копия любой страницы works/*.html
// с новым slug в <body data-slug="…"> и новыми title и og-тегами в <head>.
//
// Тексты, как на табличках wearesalut.com:
//   title            название работы
//   kind             подпись в сетке после названия
//   client, format   строки «Клиент» и «Формат» на странице работы (пусто: строки нет)
//   task, did, result   «Задача», «Что делали», «Итог» (пусто: пункта нет)
//   role             строка «Роль», пока пусто: на странице не выводится
//   ask              призыв под работой: 'studio', 'event' или 'vertical', тексты в work.js (нет: общий)
//   wall             false: работы нет в сетке 16:9 на главной (вертикальная работа стоит только в ряду ниже)
//   verticalTile     плитка 9:16 в ряду «Вертикальные ролики» под сеткой: poster и loop из media/<slug>/
//                    без расширения; kind заменяет подпись работы под плиткой
//   {{текст}}        факт ещё не подтвердил Глеб: посетитель видит обычный текст,
//                    а по адресу с ?review=1 он подчёркнут. Подтвердил: убрать скобки.
//
// Файлы лежат в media/<slug>/:
//   poster.jpg (1920w), poster-960.jpg   обложка в сетке и кадр до старта фильма 16:9
//   loop.mp4                             немая петля в сетке; у работы без фильма она же на странице
//   loop-v.mp4                           немая петля 9:16 плитки в ряду вертикальных роликов
//   still-N.jpg (1600w)                  кадры под текстом, список в stills
//   <film id>/master.m3u8                свой фильм в HLS, рядом папки качеств из levels (1080/, 720/)
//
// Видео на странице работы, список films. Каждый ролик либо свой, либо с Яндекс Диска:
//   id       свой ролик в HLS из media/<slug>/<id>/, levels: качества в папке
//   ydisk    путь к файлу в публичной папке YDISK ниже. Играет прямо с Диска: по «Смотреть»
//            страница берёт у API Диска свежую ссылку на файл (без Referer, Диск его не пускает).
//            Не ответил Диск: сообщение, свой фрагмент работы (если есть) и ссылка в Telegram.
//   label, duration   подпись под плеером, например «Выпуск 1 · 56 мин»
//   ratio    '16/9' или '9/16'
//   poster   кадр до старта без .jpg (по умолчанию poster); у вертикалей рядом <poster>-s.jpg,
//            маленькая обложка для ленты, когда роликов больше пяти
//   Несколько роликов: под плеером переключатель (больше пяти: лента обложек).
//   Пусто: на странице немая петля и кадры, без кнопки воспроизведения.
//
//   embed    плеер RuTube или VK, только https:
//              https://rutube.ru/play/embed/<ID>/?p=<KEY>
//              https://vk.com/video_ext.php?oid=…&id=…&hash=…&hd=2
//            Задан: страница работы первым показывает его (16:9, без автозапуска), ролики из films
//            остаются вкладками рядом. Сторонний плеер создаётся только на странице работы.
//   embedLabel, embedDuration   подпись под этим плеером.

/** Публичная папка «Кейсы SALUT» на Яндекс Диске: отсюда играют ролики с полем ydisk. */
export const YDISK = 'https://disk.yandex.ru/d/Qmf7NYQ4vxci_g';

/**
 * @typedef {{ id?: string, ydisk?: string, label: string, duration: string, ratio: '16/9' | '9/16',
 *             levels?: number[], poster?: string }} Film
 * @typedef {{ slug: string, title: string, kind: string, client: string, format: string,
 *             role: string, task: string, did: string, result: string, ask?: 'studio' | 'event' | 'vertical', stills: string[],
 *             films: Film[], embed: string, embedLabel: string, embedDuration: string,
 *             hidden?: boolean, wall?: boolean, verticalTile?: { poster: string, loop: string, kind?: string } }} Work
 */

const PG = '/1. Видео-портфолио/1. Интервью/Персона Грата ';
const vertical = (id, label, duration) => ({ id, label, duration, ratio: '9/16', levels: [1080, 720], poster: 'v-' + id });

/** @type {ReadonlyArray<Work>} */
export const WORKS = Object.freeze([
  {
    slug: 'crace',
    title: 'Уралхим CRACE',
    kind: 'Съёмка соревнований',
    client: 'Уралхим',
    format: '{{Съёмка соревнований}}',
    role: '',
    task: '{{Сделать ролики с соревнований для соцсетей.}}',
    did: '{{Снимали в 4K, монтировали под бит, цвет делали по LUT.}}',
    result: '{{6 вертикальных роликов.}}',
    ask: 'event',
    stills: ['still-1', 'still-2', 'still-3'],
    // Общая работа: на странице петля и кадры. Вертикальный рилс с этих соревнований стоит отдельно, FOCUS Team.
    films: [],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'miu-miu-new-balance',
    title: 'MIU MIU × New Balance 530', //  : «New Balance» never splits across lines
    kind: 'Обзор для YouTube',
    client: 'nolimit, YouTube‑канал', // non-breaking hyphen: «YouTube-» and «канал» never split
    format: 'Обзор в студии',
    role: '',
    task: '{{Снять обзор коллаборации.}}',
    did: '{{Снимали ведущего в студии, распаковку сверху и детали в макро. Лампы оставили в кадре.}}',
    result: '{{Выпуск на 14 минут.}}',
    ask: 'studio',
    stills: ['still-1', 'still-2', 'still-3'],
    // Свой фрагмент первым: он стартует сразу, а полный выпуск идёт с Диска дольше и зависит от Диска.
    films: [
      { id: 'film', label: 'Фрагмент выпуска', duration: '1:20', ratio: '16/9', levels: [1080, 720] },
      { ydisk: '/MIU MIU x NEW BALANCE 530.mp4', label: 'Полный выпуск', duration: '14 мин', ratio: '16/9' },
    ],
    embed: '',
    embedLabel: 'Полный выпуск',
    embedDuration: '14 мин',
  },
  {
    slug: 'rosatom-tvel',
    title: 'Росатом × ТВЭЛ',
    kind: 'Ролик с фестиваля',
    client: 'Росатом, ТВЭЛ',
    format: 'Ролик с фестиваля',
    role: '',
    task: '{{Показать, как прошёл фестиваль ТВЭЛ.}}',
    did: '{{Снимали аниматоров, игры, шоу на сцене и танцы.}}',
    result: '{{Ролик на 2 минуты.}}',
    ask: 'event',
    stills: ['still-1', 'still-2', 'still-3'],
    films: [
      { id: 'film', label: 'Ролик', duration: '2:13', ratio: '16/9', levels: [1080, 720] },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'persona-grata',
    title: '«Персона Грата»',
    kind: 'Интервью, три ракурса',
    client: '«Персона Грата»',
    format: 'Интервью, три ракурса',
    role: '',
    task: '{{Снять интервью, в котором видно и ведущего, и гостью.}}',
    did: '{{Снимали общий план на двоих и крупные планы при дневном свете студии.}}',
    result: '{{3 выпуска: 56, 72 и 66 минут.}}',
    ask: 'studio',
    stills: ['still-1', 'still-2', 'still-3'],
    // Свой фрагмент первым, полные выпуски с Диска следом.
    films: [
      { id: 'film', label: 'Фрагмент выпуска', duration: '1:31', ratio: '16/9', levels: [720] },
      { ydisk: PG + '1.mp4', label: 'Выпуск 1', duration: '56 мин', ratio: '16/9', poster: 'ep-1' },
      { ydisk: PG + '2.mp4', label: 'Выпуск 2', duration: '72 мин', ratio: '16/9', poster: 'ep-2' },
      { ydisk: PG + '3.mp4', label: 'Выпуск 3', duration: '66 мин', ratio: '16/9', poster: 'ep-3' },
    ],
    embed: '',
    embedLabel: 'Полный выпуск',
    embedDuration: '56 мин',
  },
  {
    slug: 'rosatom-mediastation',
    title: 'Росатом, «Медиастанция»',
    kind: 'Ролик с мероприятия',
    client: 'Росатом',
    format: 'Ролик с мероприятия',
    role: '',
    task: '{{Показать, как прошла «Медиастанция».}}',
    did: '{{Снимали регистрацию, сессии, награждение и общее фото.}}',
    result: '{{Ролик на 2 минуты.}}',
    ask: 'event',
    stills: ['still-1', 'still-2', 'still-3'],
    films: [
      { id: 'film', label: 'Ролик', duration: '2:08', ratio: '16/9', levels: [1080, 720] },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'focus-team',
    title: 'FOCUS Team',
    kind: 'Вертикальный ролик',
    client: '',
    format: '{{Вертикальный ролик}}',
    role: '',
    task: '',
    did: '{{Снимали команду на финише Уралхим CRACE и интервью с ведущим.}}',
    result: '',
    ask: 'event',
    stills: [],
    wall: false,
    verticalTile: { poster: 'reel-poster', loop: 'loop-v' },
    films: [
      { id: 'film', label: 'Ролик', duration: '0:44', ratio: '9/16', levels: [1080, 720], poster: 'reel-poster' },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'app-lite',
    title: 'App Lite',
    kind: 'Вертикальные ролики',
    client: 'App Lite, белёвская пастила',
    format: 'Вертикальные ролики',
    role: '',
    task: '{{Сделать ролики о пастиле.}}',
    did: '{{Снимали в студии фактуру крупным планом, яблоки, ягоды и упаковку.}}',
    result: '{{13 вертикальных роликов.}}',
    ask: 'vertical',
    stills: ['still-1', 'still-2', 'still-3'],
    wall: false,
    verticalTile: { poster: 'v-1', loop: 'loop-v' },
    // Все 13 роликов из папки «Белевская пастила» на Диске.
    films: [
      { id: 'film-1', label: 'Classic', duration: '0:25', ratio: '9/16', levels: [1080, 720], poster: 'v-1' },
      { id: 'film-2', label: 'Meringue Berry', duration: '0:34', ratio: '9/16', levels: [1080, 720], poster: 'v-2' },
      { id: 'film-3', label: 'Cinnamon', duration: '0:21', ratio: '9/16', levels: [1080, 720], poster: 'v-3' },
      vertical('meringue-classic', 'Meringue Classic', '0:38'),
      vertical('berry', 'Berry', '0:32'),
      vertical('n1', 'Ролик 1', '0:24'),
      vertical('n2', 'Ролик 2', '0:23'),
      vertical('n3', 'Ролик 3', '0:24'),
      vertical('n4', 'Ролик 4', '0:23'),
      vertical('n5', 'Ролик 5', '0:24'),
      vertical('n6', 'Ролик 6', '0:23'),
      vertical('n7', 'Ролик 7', '0:24'),
      vertical('n8', 'Ролик 8', '0:23'),
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'mst',
    title: 'ГК МСТ',
    kind: 'Ролики с выставки',
    client: 'ГК МСТ',
    format: '{{Вертикальные ролики}}',
    role: '',
    task: '{{Сделать ролики со стенда на выставке эстетической медицины.}}',
    did: '{{Снимали оборудование в работе и комментарии специалистов.}}',
    result: '{{2 вертикальных ролика.}}',
    ask: 'event',
    stills: ['still-1'],
    wall: false,
    verticalTile: { poster: 'poster-v', loop: 'loop-v' },
    films: [
      { id: 'film', label: 'Полная версия', duration: '1:41', ratio: '9/16', levels: [720], poster: 'poster-v' },
      { id: 'film-2', label: 'Илья Савельев', duration: '0:44', ratio: '9/16', levels: [1080, 720], poster: 'v-2' },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'cosmetology',
    title: 'Косметология',
    kind: 'Вертикальный ролик',
    client: '',
    format: '{{Вертикальный ролик}}',
    role: '',
    task: '',
    did: '{{Снимали процедуру на модели: чёрный фон, крупные планы.}}',
    ask: 'vertical',
    result: '',
    stills: [],
    wall: false,
    verticalTile: { poster: 'poster-v', loop: 'loop-v' },
    films: [
      { id: 'film', label: 'Ролик', duration: '0:15', ratio: '9/16', levels: [720], poster: 'poster-v' },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
].map((work) => Object.freeze(work)));

/** Works on the site, in order: hidden ones are left out of the grid and of prev/next. */
export const SHOWN = Object.freeze(WORKS.filter((work) => !work.hidden));
/** The 16:9 wall on the home page. */
export const WALL = Object.freeze(SHOWN.filter((work) => work.wall !== false));
/** The row of 9:16 tiles under the wall, «Вертикальные ролики». */
export const VERTICAL_TILES = Object.freeze(SHOWN.filter((work) => work.verticalTile));
