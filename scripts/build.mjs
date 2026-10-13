// Сборка лендинга без зависимостей: src/ + data/clubs.json + public/ -> dist/
// Переменные окружения:
//   SITE_URL       канонический адрес (по умолчанию https://srppoker.ru)
//   LEAD_ENDPOINT  URL, куда форма шлёт POST JSON с заявкой
//   METRIKA_ID     номер счётчика Яндекс.Метрики (грузится только после согласия на cookie)
//   BASE_PATH      подпапка сайта, например /srp-landing/ для GitHub Pages (по умолчанию /)
//   DEMO=1         демо-сборка: noindex и запрет индексации в robots.txt
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const SITE_URL = (process.env.SITE_URL || "https://srppoker.ru").replace(/\/$/, "");
const LEAD_ENDPOINT = process.env.LEAD_ENDPOINT || "";
const METRIKA_ID = process.env.METRIKA_ID || "";
const BASE_PATH = `/${(process.env.BASE_PATH || "").replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");
const DEMO = process.env.DEMO === "1";

const clubs = JSON.parse(readFileSync(join(root, "data/clubs.json"), "utf8"));

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmtPhone = (p) => p.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, "+7 ($1) $2-$3-$4");
const norm = (s) => s.toLowerCase().replace(/ё/g, "е");

// Города без клубов: показываем «белые пятна» на карте. Это не обещание доступности территории.
const ghosts = [
  [55.03, 82.92], [56.01, 92.85], [52.29, 104.3], [48.48, 135.08], [43.12, 131.89],
  [45.04, 38.98], [53.2, 50.15], [58.01, 56.25], [47.23, 39.72], [48.71, 44.51], [62.03, 129.73], [68.97, 33.08],
];

const cities = [...new Set(clubs.map((c) => c.city))];
if (cities.length < 2) throw new Error("data/clubs.json пуст или повреждён");

const logoSrc = (c) => `/img/clubs/${c.logo}`;

const cardsHtml = clubs
  .map((c, i) => {
    const search = norm(`${c.city} ${c.name} ${c.address}`);
    const meta = [
      `<li class="meta-addr">${esc(c.address)}</li>`,
      c.phone ? `<li><a href="tel:${c.phone}">${fmtPhone(c.phone)}</a></li>` : "",
      c.telegram ? `<li><a href="${esc(c.telegram)}" target="_blank" rel="noopener">Telegram-канал</a></li>` : "",
    ].join("");
    return `<article class="club tilt reveal" style="--d:${(i % 6) * 60}ms" data-city="${esc(c.city)}" data-search="${esc(search)}">
  <img class="club-mark" src="${logoSrc(c)}" alt="" width="240" height="240" loading="lazy" decoding="async">
  ${c.photos && c.photos.length ? `<figure class="club-cover"><img src="${esc(c.photos[0])}" alt="Клуб ${esc(c.name)}, ${esc(c.city)}" width="960" height="540" loading="lazy" decoding="async"></figure>` : ""}
  <div class="club-body">
    <p class="club-city">${esc(c.city)}</p>
    <h3>${esc(c.name)}</h3>
    ${c.blurb ? `<p class="club-blurb">${esc(c.blurb)}</p>` : ""}
    <ul class="club-meta">${meta}</ul>
    <button class="club-more" type="button" data-club="${esc(c.id)}">Подробнее о клубе <svg class="ico"><use href="#i-arrow"/></svg></button>
  </div>
</article>`;
  })
  .join("\n");

const chipsHtml =
  `<button class="chip is-on" type="button" data-city="" aria-pressed="true">Все клубы <b>${clubs.length}</b></button>\n` +
  [...cities]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((city) => {
      const n = clubs.filter((c) => c.city === city).length;
      return `<button class="chip" type="button" data-city="${esc(city)}" aria-pressed="false">${esc(city)}${n > 1 ? ` <b>${n}</b>` : ""}</button>`;
    })
    .join("\n");

const medal = (c, aria) => `<span class="medal"${aria ? ' aria-hidden="true"' : ""}><img src="${logoSrc(c)}" alt="${aria ? "" : esc(c.name + ", " + c.city)}" width="72" height="72" loading="lazy" decoding="async"></span>`;
const half = Math.ceil(clubs.length / 2);
const wallRow = (list) => {
  const once = list.map((c) => medal(c, false)).join("");
  const twice = list.map((c) => medal(c, true)).join("");
  return `<div class="wall-track">${once}${twice}</div>`;
};
const wallHtml = `<div class="wall-row">${wallRow(clubs.slice(0, half))}</div>\n<div class="wall-row wall-row--rev">${wallRow(clubs.slice(half))}</div>`;

const suits = ["♠", "♥", "♦", "♣"];
const tickerHtml = [...cities, ...cities]
  .map((city, i) => `<span>${esc(city)}</span><em aria-hidden="true">${suits[i % 4]}</em>`)
  .join("");

const verified = clubs.filter((c) => c.verified);
const jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "СРП — федеральная сеть спортивно-развлекательного покера",
      alternateName: "SRP",
      url: SITE_URL,
      logo: `${SITE_URL}/img/icon-512.png`,
      legalName: "ИП Тимофеев Максим Сергеевич",
      taxID: "761102874409",
      areaServed: "RU",
    },
    {
      "@type": "ItemList",
      name: "Клубы сети СРП",
      itemListElement: verified.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "SportsActivityLocation",
          name: `СРП ${c.name}`,
          address: { "@type": "PostalAddress", addressCountry: "RU", addressLocality: c.city, streetAddress: c.address },
          ...(c.phone ? { telephone: c.phone } : {}),
          parentOrganization: { "@id": `${SITE_URL}/#org` },
        },
      })),
    },
  ],
};

const tokens = {
  "<!--@club-cards-->": cardsHtml,
  "<!--@city-chips-->": chipsHtml,
  "<!--@logo-wall-->": wallHtml,
  "<!--@ticker-->": tickerHtml,
  "<!--@jsonld-->": `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`,
  "{{SITE_URL}}": SITE_URL,
  "{{LEAD_ENDPOINT}}": esc(LEAD_ENDPOINT),
  "{{METRIKA_ID}}": esc(METRIKA_ID),
  "{{CLUBS_TOTAL}}": String(clubs.length),
  "{{CITIES_TOTAL}}": String(cities.length),
  "{{CLUBS_JSON}}": JSON.stringify(clubs.map((c) => ({ id: c.id, city: c.city, name: c.name, lat: c.lat, lon: c.lon }))).replace(/</g, "\\u003c"),
  "{{GHOSTS_JSON}}": JSON.stringify(ghosts),
  "{{CLUB_INFO_JSON}}": JSON.stringify(
    Object.fromEntries(
      clubs.map((c) => [
        c.id,
        { name: c.name, city: c.city, address: c.address, phone: c.phone || "", phoneText: c.phone ? fmtPhone(c.phone) : "", telegram: c.telegram || "", logo: logoSrc(c), about: c.about || c.blurb || "", photos: c.photos || [] },
      ]),
    ),
  ).replace(/</g, "\\u003c"),
};

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), dist, { recursive: true });

let html = readFileSync(join(root, "src/index.html"), "utf8");
for (const [k, v] of Object.entries(tokens)) html = html.split(k).join(v);
if (DEMO) html = html.replace("<head>", '<head>\n  <meta name="robots" content="noindex, nofollow">');
// пути от корня (/img, /video, /fonts, скрипты и стили) переносим в подпапку BASE_PATH
const rebase = (s) => (BASE_PATH === "/" ? s : s.replace(/(["'(])\/(img|video|fonts|styles\.css|main\.js|map3d\.js)\b/g, `$1${BASE_PATH}$2`));
writeFileSync(join(dist, "index.html"), rebase(html));
for (const f of ["styles.css", "main.js", "map3d.js"]) writeFileSync(join(dist, f), rebase(readFileSync(join(root, "src", f), "utf8")));

writeFileSync(join(dist, "robots.txt"), DEMO ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>\n`,
);

console.log(`build ok: ${clubs.length} клубов, ${cities.length} городов -> dist/`);
if (!LEAD_ENDPOINT) console.warn("! LEAD_ENDPOINT не задан: форма заявки не будет отправляться (для продакшена обязательно).");
