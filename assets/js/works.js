// Работы портфолио SALUT. Один файл на всё: сетка на главной, страницы works/<slug>.html,
// плееры и подписи под ними берут данные отсюда. Разметку для правок трогать не нужно.
//
// Порядок в списке = порядок в сетке и в «Предыдущая / Следующая». Сильные работы первыми:
// 24.10 Глеб оставил CRACE первой и MIU MIU второй, третьей встала App Lite. Тот же порядок
// в WORKS у portfolio-src/tools-v3/make_pages.py.
// hidden: true убирает работу из сетки и листания, файлы остаются на диске. Чтобы они не ушли
// в публикацию, их пути пишутся в GITIGNORE того же make_pages.py.
// Новая работа: запись здесь, папка media/<slug>/ и копия любой страницы works/*.html
// с новым slug в <body data-slug="…"> и новыми title и og-тегами в <head>.
//
// Тексты, как на табличках wearesalut.com:
//   title            название работы
//   kind             подпись в сетке после названия
//   client, format   строки «Клиент» и «Формат» на странице работы (пусто: строки нет)
//   task, did, result   «Задача», «Что делали», «Итог» (пусто: пункта нет)
//   role             строка «Роль», пока пусто: на странице не выводится
//   {{текст}}        факт ещё не подтвердил Глеб: посетитель видит обычный текст,
//                    а по адресу с ?review=1 он подчёркнут. Подтвердил: убрать скобки.
//
// Файлы лежат в media/<slug>/:
//   poster.jpg (1920w), poster-960.jpg   обложка в сетке и кадр до старта фильма 16:9
//   loop.mp4                             немая петля в сетке; у работы без фильма она же на странице
//   still-N.jpg (1600w)                  кадры под текстом, список в stills
//   <film id>/master.m3u8                свой фильм в HLS, рядом папки качеств из levels (1080/, 720/)
//
// Видео на странице работы, список films. Каждый ролик либо свой, либо с Яндекс Диска:
//   id       свой ролик в HLS из media/<slug>/<id>/, levels: качества в папке
//   ydisk    путь к файлу в публичной папке YDISK ниже. Играет прямо с Диска: по «Смотреть»
//            страница берёт у API Диска свежую ссылку на файл (без Referer, Диск его не пускает).
//            Не ответил Диск: сообщение и ссылка «Открыть на Яндекс Диске».
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
 *             role: string, task: string, did: string, result: string, stills: string[],
 *             films: Film[], embed: string, embedLabel: string, embedDuration: string,
 *             hidden?: boolean }} Work
 */

const PG = '/1. Видео-портфолио/1. Интервью/Персона Грата ';
const vertical = (id, label, duration) => ({ id, label, duration, ratio: '9/16', levels: [1080, 720], poster: 'v-' + id });

/** @type {ReadonlyArray<Work>} */
export const WORKS = Object.freeze([
  {
    slug: 'crace',
    title: 'Уралхим CRACE',
    kind: 'Соревнования',
    client: 'Уралхим',
    format: '{{Съёмка соревнований}}',
    role: '',
    task: '{{Уралхиму нужны были ролики с соревнований для соцсетей.}}',
    did: '{{4K, цвет по LUT, монтаж под бит.}}',
    result: '{{6 вертикальных роликов для соцсетей.}}',
    stills: ['still-1', 'still-2', 'still-3'],
    // Фильма нет: на странице петля и кадры. Готовый рилс REEL03 (0:44, 9:16, из Загрузок, 12.09)
    // лежит вне сайта в portfolio-src/video-out-v2/crace/. Если Глеб подтвердит: скопировать film/
    // и reel-poster.jpg в media/crace/ и вписать сюда
    // { id: 'film', label: 'Ролик с соревнований', duration: '0:44', ratio: '9/16', levels: [1080, 720], poster: 'reel-poster' }
    films: [],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'miu-miu-new-balance',
    title: 'MIU MIU × New Balance 530', //  : «New Balance» never splits across lines
    kind: 'Обзор для nolimit',
    client: 'nolimit, YouTube-канал',
    format: 'Обзор, студия',
    role: '',
    task: '{{Каналу nolimit нужен был обзор коллаборации в студии.}}',
    did: '{{Ведущий в студии, лампы в кадре, распаковка сверху, детали в макро.}}',
    result: '{{Выпуск на 14 минут.}}',
    stills: ['still-1', 'still-2', 'still-3'],
    films: [
      { ydisk: '/MIU MIU x NEW BALANCE 530.mp4', label: 'Полный выпуск', duration: '14 мин', ratio: '16/9' },
      { id: 'film', label: 'Фрагмент выпуска', duration: '1:20', ratio: '16/9', levels: [1080, 720] },
    ],
    embed: '',
    embedLabel: 'Полный выпуск',
    embedDuration: '14 мин',
  },
  {
    slug: 'app-lite',
    title: 'App Lite',
    kind: 'Вертикальные ролики',
    client: 'App Lite, белёвская пастила',
    format: 'Вертикальные ролики',
    role: '',
    task: '{{Пастиле App Lite нужны были вертикальные ролики.}}',
    did: '{{В студии: фактура крупным планом, яблоки, ягоды, упаковка.}}',
    result: '{{13 вертикальных роликов.}}',
    stills: ['still-1', 'still-2', 'still-3'],
    // Все 13 роликов из папки «Белевская пастила» на Диске. classic, meringue_berry и cinnamon там
    // байт в байт совпадают с film-1, film-2 и film-3, 2.mp4 с portfolio-src/src/p_2.mp4.
    // 4.mp4 и berry.mp4 Диск не отдавал, взяты из локальных копий Глеба (md5 те же, что на Диске).
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
    slug: 'rosatom-tvel',
    title: 'Росатом × ТВЭЛ',
    kind: 'Ролик с фестиваля',
    client: 'Росатом, ТВЭЛ',
    format: 'Ролик с мероприятия',
    role: '',
    task: '{{Показать, как прошёл фестиваль ТВЭЛ.}}',
    did: '{{Аниматоры, игры, шоу на сцене и танцы.}}',
    result: '{{Ролик на 2 минуты.}}',
    stills: ['still-1', 'still-2', 'still-3'],
    films: [
      { id: 'film', label: 'Полная версия', duration: '2:13', ratio: '16/9', levels: [1080, 720] },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'persona-grata',
    title: '«Персона Грата»',
    kind: 'Интервью',
    client: '«Персона Грата»',
    format: 'Интервью, три ракурса',
    role: '',
    task: '{{Интервью, в котором видно и ведущего, и гостью.}}',
    did: '{{Три ракурса: общий план на двоих и крупные планы, дневной свет студии.}}',
    result: '{{Три выпуска: 56, 72 и 66 минут.}}',
    stills: ['still-1', 'still-2', 'still-3'],
    films: [
      { ydisk: PG + '1.mp4', label: 'Выпуск 1', duration: '56 мин', ratio: '16/9', poster: 'ep-1' },
      { ydisk: PG + '2.mp4', label: 'Выпуск 2', duration: '72 мин', ratio: '16/9', poster: 'ep-2' },
      { ydisk: PG + '3.mp4', label: 'Выпуск 3', duration: '66 мин', ratio: '16/9', poster: 'ep-3' },
      { id: 'film', label: 'Фрагмент выпуска', duration: '1:31', ratio: '16/9', levels: [720] },
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
    did: '{{Регистрация, сессии, награждение и общее фото.}}',
    result: '{{Ролик на 2 минуты.}}',
    stills: ['still-1', 'still-2', 'still-3'],
    films: [
      { id: 'film', label: 'Полная версия', duration: '2:08', ratio: '16/9', levels: [1080, 720] },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'mst',
    title: 'ГК МСТ',
    kind: 'Стенд на выставке',
    client: 'ГК МСТ',
    format: '{{Вертикальные ролики}}',
    role: '',
    task: '{{Ролик со стенда на выставке эстетической медицины.}}',
    did: '{{Оборудование в работе и комментарии специалистов.}}',
    result: '{{Два вертикальных ролика.}}',
    stills: ['still-1'],
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
    did: '{{Процедура на модели, чёрный фон, крупные планы.}}',
    result: '',
    stills: [],
    films: [
      { id: 'film', label: 'Ролик', duration: '0:15', ratio: '9/16', levels: [720], poster: 'poster-v' },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
  {
    slug: 'vera-borisovna',
    // Скрыта 24.10: Глеб просил «только самые лучшие работы»; слабее остальных, нет «Видео 2».
    hidden: true,
    title: 'Вера Борисовна',
    kind: 'Монолог на камеру',
    client: '',
    format: '{{Монолог на камеру, сцены приёма}}',
    role: '',
    task: '',
    did: '{{Монолог на камеру в кабинете и сцены приёма.}}',
    result: '',
    stills: ['still-1', 'still-2', 'still-3'],
    films: [
      { id: 'film-1', label: 'Одна минута', duration: '1:00', ratio: '16/9', levels: [720], poster: 'p-1' },
      { id: 'film-2', label: 'Видео 1', duration: '2:56', ratio: '16/9', levels: [720], poster: 'p-2' },
    ],
    embed: '',
    embedLabel: '',
    embedDuration: '',
  },
].map((work) => Object.freeze(work)));

/** Works on the site, in order: hidden ones are left out of the grid and of prev/next. */
export const SHOWN = Object.freeze(WORKS.filter((work) => !work.hidden));
