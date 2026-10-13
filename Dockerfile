# syntax=docker/dockerfile:1
#
# Лендинг srppoker.ru: сборка статики (node, без зависимостей) -> nginx.
# Контейнер стоит за общим nginx сервера СРП (poker-club-manager-nginx), сам наружу не публикуется.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY data ./data
COPY public ./public
COPY src ./src
# Адрес сайта для канонических ссылок/OG/sitemap; приём заявок — на том же домене (nginx проксирует в бэкенд CRM).
ARG SITE_URL=https://srppoker.ru
ARG LEAD_ENDPOINT=/api/public/franchise-leads
ARG METRIKA_ID=
# DEMO=1 — stage: noindex и запрет индексации в robots.txt
ARG DEMO=
RUN SITE_URL="$SITE_URL" LEAD_ENDPOINT="$LEAD_ENDPOINT" METRIKA_ID="$METRIKA_ID" DEMO="$DEMO" node scripts/build.mjs \
 && test -f dist/index.html && test -f dist/privacy/index.html && test -f dist/consent/index.html

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/site.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
HEALTHCHECK --interval=10s --timeout=3s --retries=6 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
