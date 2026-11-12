// Every user-facing string lives here and is read through t() (useT). UI language: Russian.
// Interpolation: {name} placeholders, filled by t('key', { name: value }).

import viewer from './ru/viewer'
import search from './ru/search'
import ops from './ru/ops'
import cases from './ru/cases'

const ru = {
  // Area strings for Stages 5–8 (one file per area; see docs/stages/parallel-rules.md).
  ...viewer,
  ...search,
  ...ops,
  ...cases,

  app: {
    name: 'Цифровой архив Астаны',
    /** Letters on the square brand mark (decorative, aria-hidden). */
    mark: 'ЦА',
    /** Document title: «Поиск — Цифровой архив Астаны». */
    titleTemplate: '{title} — {app}',
    skipToContent: 'К содержимому',
  },

  roles: {
    admin: 'Администратор',
    archivist: 'Архивист',
    operator: 'Оператор',
    reader: 'Читатель',
  },

  nav: {
    label: 'Основное меню',
    groups: {
      fond: { kk: 'Қор', ru: 'Фонд' },
      processing: { kk: 'Өңдеу', ru: 'Обработка' },
      system: { kk: 'Жүйе', ru: 'Система' },
    },
    search: 'Поиск',
    dela: 'Дела',
    collections: 'Подборки',
    ops: 'Панель оператора',
    upload: 'Загрузка',
    errors: 'Ошибки',
    review: 'Очередь проверки',
    journal: 'Журнал',
    admin: 'Администрирование',
  },

  pages: {
    login: 'Вход',
    search: 'Поиск',
    page: 'Страница',
    dela: 'Дела',
    delo: 'Дело',
    collections: 'Подборки',
    collection: 'Подборка',
    ops: 'Панель оператора',
    upload: 'Загрузка',
    errors: 'Ошибки',
    review: 'Очередь проверки',
    journal: 'Журнал',
    admin: 'Администрирование',
    specimen: 'Образец токенов',
  },

  placeholder: {
    body: 'Экран появится на следующих этапах.',
  },

  auth: {
    username: 'Логин',
    password: 'Пароль',
    submit: 'Войти',
    submitting: 'Вход…',
    logout: 'Выйти',
    userMenu: 'Меню пользователя',
    title: 'Вход',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    usernameRequired: 'Введите логин',
    passwordRequired: 'Введите пароль',
    demoTitle: 'Демо-доступ',
    demoHint: 'Пароль совпадает с логином. Нажмите роль, чтобы войти.',
    demoAs: 'Войти как {role}',
    sessionExpired: 'Сеанс завершён. Войдите снова.',
  },

  errors: {
    forbidden: 'Нет доступа',
    forbiddenBody: 'Недостаточно прав для этого раздела. Обратитесь к администратору.',
    notFound: 'Не найдено',
    notFoundBody: 'Такой страницы нет или она недоступна.',
    generic: 'Что-то пошло не так',
    genericBody: 'Повторите попытку. Если ошибка повторится, сообщите администратору.',
    network: 'Нет связи с сервером',
    request: 'Ошибка запроса',
    status: 'Ошибка {status}',
    validation: 'Проверьте введённые данные',
    toStart: 'На главную',
    retry: 'Повторить',
  },

  state: {
    loading: 'Загрузка…',
    empty: 'Нет данных',
  },

  langs: {
    'ru': 'RU',
    'kk-cyrl': 'KK',
    'kk-latn': 'KK-лат',
    'kk-arab': 'KK-араб',
  },

  langsFull: {
    'auto': 'Автоопределение',
    'ru': 'Русский (RU)',
    'kk-cyrl': 'Казахский, кириллица (KK)',
    'kk-latn': 'Казахский, яналиф (KK-лат)',
    'kk-arab': 'Казахский, төте (KK-араб)',
  },

  // Handoff §4 and spec 2 §Status mapping.
  status: {
    file: {
      queued: 'в очереди',
      retry: 'повтор',
      uploaded: 'загружено',
      invalid: 'ошибка',
    },
    page: {
      pending: 'в очереди',
      running: 'распознаётся',
      done: 'распознано',
      failed: 'ошибка',
    },
    review: {
      pending: 'на проверке',
      reviewed: 'проверено',
    },
    retryIn: 'повтор через {time}',
    elapsed: 'идёт {time}',
  },

  access: {
    restricted: 'Ограниченный доступ',
  },

  eais: {
    online: 'ЕАИС на связи',
    down: 'ЕАИС недоступна',
    unknown: 'ЕАИС: нет данных',
    downHint: 'Файлы ждут в очереди и загрузятся автоматически',
    retryIn: 'Повтор через {time}',
    retryNow: 'Повтор сейчас',
    downSince: 'Недоступна с {time}',
    details: 'Состояние системы',
    problems: 'Сбоев: {count}',
    statusOnline: 'на связи',
    statusDown: 'недоступна',
    system: 'ЕАИС',
    workers: {
      title: 'Службы',
      watcher: 'Приём файлов из папки',
      upload: 'Отправка в ЕАИС',
      ocr: 'Распознавание',
      ok: 'работает',
      stale: 'нет сигнала {age}',
      never: 'нет сигнала',
    },
    disk: {
      title: 'Диск',
      free: 'Свободно {gb} ГБ',
      low: 'Мало места',
    },
  },

  notifications: {
    title: 'Уведомления',
    open: 'Уведомления, непрочитанных: {count}',
    openNone: 'Уведомления',
    markAllRead: 'Отметить все прочитанными',
    empty: 'Уведомлений нет',
    loading: 'Загрузка уведомлений…',
    error: 'Не удалось загрузить уведомления',
    retry: 'Повторить',
    unread: 'Новое',
    overflow: '99+',
    levels: {
      info: 'Информация',
      warn: 'Предупреждение',
      error: 'Ошибка',
    },
  },

  // ShifrPlate micro-labels (spec 2 §ShifrPlate): Kazakh · Russian, 10 px uppercase.
  plate: {
    fond: { kk: 'Қор', ru: 'Фонд', short: 'Ф.' },
    opis: { kk: 'Тізімдеме', ru: 'Опись', short: 'Оп.' },
    delo: { kk: 'Іс', ru: 'Дело', short: 'Д.' },
    leaf: { kk: 'Парақ', ru: 'Лист', short: 'л.' },
    aria: 'Шифр: фонд {fond}, опись {opis}, дело {delo}, лист {leaf}',
    ariaNoLeaf: 'Шифр: фонд {fond}, опись {opis}, дело {delo}',
  },

  // Dev-only token specimen (/_specimen).
  specimen: {
    intro: 'Проверка темы: цвета, элементы управления, статусы, шрифты и состояния гражданских полей. Страница есть только в режиме разработки.',
    sections: {
      colors: 'Семантические цвета',
      aliases: 'Псевдонимы проекта',
      surfaces: 'Поверхности и текст',
      controls: 'Кнопки и поля (размер lg)',
      statuses: 'Статусы',
      type: 'Шрифты и шкала',
      civic: 'Рельс и шапка',
      shifr: 'Шифр: табличка и строка',
    },
    swatch: {
      primary: 'Действие',
      secondary: 'Табличка',
      success: 'Успех',
      warning: 'Предупреждение',
      error: 'Ошибка',
      info: 'Справка',
      neutral: 'Нейтральный',
      rail: 'Рельс',
      railActive: 'Рельс: активный',
      railMuted: 'Рельс: подписи',
      railField: 'Поле в шапке',
      locator: 'Вы здесь',
      ink: 'Чернила',
      hit: 'Найдено',
      scanPane: 'Поле скана',
      meter: 'Шкала',
      meterTrack: 'Дорожка шкалы',
      lowconfFill: 'Низкая уверенность',
      eaisOk: 'ЕАИС на связи',
      ground: 'Фон',
      panel: 'Панель',
      elevated: 'Панель инструментов',
    },
    text: {
      default: 'Основной текст',
      toned: 'Акцентный второстепенный',
      muted: 'Второстепенный',
      dimmed: 'Третичный (только на белом и фоне)',
      link: 'Ссылка',
    },
    controls: {
      primary: 'Сохранить',
      outline: 'Экспорт',
      ghost: 'Отмена',
      danger: 'Удалить',
      disabled: 'Недоступно',
      loading: 'Отправка',
      inputLabel: 'Шифр дела',
      inputPlaceholder: 'Ф.1 Оп.1 Д.12',
      selectLabel: 'Язык распознавания',
      checkbox: 'Только непроверенные',
      switch: 'Рамки слов',
      textareaLabel: 'Комментарий',
      radioLabel: 'Нечёткий поиск',
      fuzzy0: 'Точное совпадение',
      fuzzy1: 'Допускать опечатки',
      fuzzy2: 'Больше опечаток',
      toast: 'Показать уведомление',
      toastMessage: 'Дубликат файла 002.tif (Ф.1 Оп.1 Д.12)',
      checkboxRequired: 'Справка готова к выдаче',
      checkboxRequiredHint: 'Проверьте шифр по разделу',
      checkboxRequiredLink: 'Шифр',
    },
    shifr: {
      page: 'Страница: лист — текущее место, дело — ссылка',
      long: 'Длинные значения',
      noLeaf: 'Без листа: дело — текущее место',
      narrow: 'Узкая колонка (320 px): таблички переносятся',
      compact: 'Строка в списках',
    },
    statusGroups: {
      file: 'Файлы (M1)',
      page: 'Страницы (M2)',
      review: 'Проверка',
      lang: 'Языки',
      counts: 'Счётчики',
    },
    typeScale: 'Шкала: 12 / 13 / 14 / 16 / 18 / 22 / 28',
    sizeLabel: '{size} px',
    samples: {
      title: 'Протоколы заседаний горисполкома',
      ru: 'Акмолинский городской исполнительный комитет, 1954 год',
      kk: 'Қазақ тілі: ә ғ қ ң ө ұ ү һ і — Әлібек, Ғалым, Қосымша, Ұлттық, Үкімет, Һәм, Іс',
      yanalif: 'Яналиф: Əlifbij, ƣalym, ꞑaƶ, Ꞑ, ɵz, ƶol, ьj, şart, çeber, ırƣaq',
      arabic: 'اقمولا قالاسىندا مەكتەپتەر اشىلدى. مۇعالىمدەر جاقسى جۇمىس',
      arabicCaption: 'Төте (KK-араб), справа налево',
      plate: 'Подпись таблички',
      numbers: 'Ф.1 Оп.1 Д.12 · л.3 — 96,0 % — 12.11.2026',
    },
    civic: {
      searchLabel: 'Поиск по архиву',
      searchPlaceholder: 'Поиск по тексту и шифру',
      hint: 'Проверьте Tab: фокус на рельсе и в шапке рисуется белым.',
      user: 'Архивист Демо',
    },
  },
} as const

export default ru
export type Messages = typeof ru
