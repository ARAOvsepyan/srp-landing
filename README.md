# srp-landing

Лендинг федеральной сети СРП (спортивно-развлекательный покер). Цель — продать франшизу/партнёрство и показать масштаб сети. Анализ старого сайта и решения: [docs/ANALYSIS.md](docs/ANALYSIS.md).

Дизайн собирается в Claude Design на отдельной системе «СРП Франшиза» (токены, 10 компонентов, карта сети, логотипы клубов):

- система: [claude.ai/artifact/B9bUm4meSq1KjziDYa6AXF](https://claude.ai/artifact/B9bUm4meSq1KjziDYa6AXF), исходники в `design-system/project/`
- холст лендинга: [claude.ai/artifact/VMQY3tjmWkhBJMWYSM3dkp](https://claude.ai/artifact/VMQY3tjmWkhBJMWYSM3dkp), исходники в `claude-design/project/`

Это отдельные от сайта артефакты: `design-system/` и `claude-design/` в сборку не входят.

Статика без зависимостей. Нужен только Node 20+.

```bash
npm run dev     # сборка + сервер на http://localhost:5173 с автопересборкой
npm run build   # сборка в dist/
BASE_PATH=/srp-landing/ DEMO=1 npm run build   # демо в подпапке, noindex (так собирает GitHub Pages)
```

Демо на GitHub Pages собирается и выкладывается workflow `.github/workflows/pages.yml` при пуше в `main`.

## Структура

```
data/clubs.json        клубы: город, адрес, телефон, координаты, логотип
src/index.html         шаблон страницы (токены <!--@...--> и {{...}} заполняет сборка)
src/styles.css         стили, тёмная золотая тема, токены в :root
src/main.js            параллакс, раскадровка сцен (карта, Лига городов), живой экран приложения, фильтр клубов, форма
src/map3d.js           3D-карта России на canvas: поле точек, световые столбы над городами, дуги, «новые города»
scripts/build.mjs      сборка: карточки клубов, данные для глобуса, JSON-LD, sitemap, robots
scripts/dev.mjs        dev-сервер
scripts/og.html        исходник OG-картинки
public/                шрифты, логотипы клубов, карта, видео CRM
```

## Переменные сборки

| Переменная | Что делает |
|---|---|
| `SITE_URL` | канонический адрес, OG, sitemap (по умолчанию `https://srppoker.ru`) |
| `LEAD_ENDPOINT` | URL, куда форма шлёт `POST` JSON: `name, contact, city, intent, consent, page, utm, at`. **Без него форма не отправляется** |
| `METRIKA_ID` | счётчик Яндекс.Метрики; грузится только после согласия на cookie |

```bash
SITE_URL=https://srppoker.ru LEAD_ENDPOINT=https://api.example.ru/public/leads METRIKA_ID=110446705 npm run build
```

Содержимое `dist/` — обычная статика: nginx, Netlify, любой хостинг. Карта, пины, фильтр и SEO-разметка собираются из `clubs.json`.

## Как добавить клуб

1. Положите логотип в `public/img/clubs/` (SVG или WebP до ~360 px).
2. Добавьте объект в `data/clubs.json` (координаты — широта/долгота города).
3. `verified: false` — клуб на карте и в каталоге, но без описания и вне JSON-LD.

Счётчики «N из M клубов» и «городов» считаются сами.

## OG-картинка

Исходник `scripts/og.html`. Перегенерация при запущенном `npm run dev`:

```bash
cp scripts/og.html dist/og.html && "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=1200,630 --virtual-time-budget=4000 --screenshot=public/img/og.png http://localhost:5173/og.html; rm dist/og.html
```

## Эффекты и производительность

- Параллакс, появление блоков и наклон карточек складываются в один `transform` через CSS-переменные; один `requestAnimationFrame`, скролл-слушатель пассивный.
- Hero: фирменный 3D-ролик `public/video/hero-chips.mp4` (карты и фишки с медведем, из приложения) смешан с фоном через `mix-blend-mode: screen`, под ним светящаяся дуга горизонта.
- Сцена масштаба `.orbit` (460vh, закреплена): наклонённая 3D-карта России из золотых точек (`src/map3d.js`, территория из `public/img/map-russia.svg`). Над городами по очереди поднимаются световые столбы, счётчик клубов растёт, затем камера отъезжает к «новым городам» и появляется проверка города. Раскадровка — `driveNetwork()` в `src/main.js`.
- Сцена Лиги городов `.lg-scene` (340vh, закреплена): видео финала (`public/video/league-final.mp4`, грузится только у секции) раскрывается из карточки на весь экран, фото клубов разлетаются, поверх выезжают карточки лиг. Раскадровка — `driveLeague()`.
- Блок IT: Mac с записями CRM (вкладки) и iPhone с живым демо-экраном приложения (время, таймер турнира, места, рейтинг обновляются раз в секунду, пока экран виден). Устройства на разных глубинах параллакса, выпрямляются при прокрутке.
- Закреплённых сцен ровно две; видео играют только в видимой области.
- `prefers-reduced-motion`: параллакс, бегущие строки и анимации отключаются.
- Без JS контент виден (скрытие блоков включает `html.js`).

## Что ещё не подключено

- Приёмник заявок (`LEAD_ENDPOINT`).
- Политики конфиденциальности/ПДн ведут на `srppoker.ru/privacy` и `/consent`; при переезде домена перенести тексты.
- Реальные фото клубов и имена в отзывах.
- Страницы городов для SEO (`/kazan` и т. д.): сборка готова к расширению, шаблона пока нет.
