#!/bin/sh
# Выкладка лендинга на сервере СРП (запускает GitLab CI по SSH из чекаута нужного коммита).
#
#   sh deploy/deploy.sh <stage|prod> "<домены через пробел, первый — основной>" <имя сертификата>
#
# 1. Собирает образ srp-landing:<env> (прежний сохраняется как :<env>-prev для отката).
# 2. Пересоздаёт контейнер <env>-landing и ждёт healthcheck; не поднялся — возвращает прежний образ.
# 3. Ставит конфиг домена в общий nginx: HTTPS, если сертификат уже выпущен, иначе HTTP (+ проверка Let's Encrypt).
#    nginx -t не прошёл — возвращает прежний конфиг, nginx не перезагружается.
set -eu

ENV="${1:?env: stage|prod}"
DOMAINS="${2:?domains}"
CERT="${3:?certificate name}"
PRIMARY="${DOMAINS%% *}"

NGINX_CONTAINER="${NGINX_CONTAINER:-poker-club-manager-nginx}"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/opt/poker_club_manager/nginx/conf.d}"
DOCKER_NETWORK="${DOCKER_NETWORK:-poker_club_manager}"
IMAGE="srp-landing:${ENV}"
CONF="${NGINX_CONF_DIR}/landing-${ENV}.conf"

case "$ENV" in
  prod) DEMO="" ;;
  stage) DEMO="1" ;;
  *) echo "ERROR: unknown env $ENV" >&2; exit 1 ;;
esac

echo "=== Landing deploy: env=$ENV primary=$PRIMARY domains=[$DOMAINS] cert=$CERT ==="

docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1 || docker network create "$DOCKER_NETWORK"

if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker tag "$IMAGE" "${IMAGE}-prev"
fi

docker build --pull \
  --build-arg SITE_URL="https://${PRIMARY}" \
  --build-arg LEAD_ENDPOINT="/api/public/franchise-leads" \
  --build-arg METRIKA_ID="${METRIKA_ID:-}" \
  --build-arg DEMO="$DEMO" \
  -t "$IMAGE" .

compose() { LANDING_ENV="$ENV" docker compose -p "landing-${ENV}" -f deploy/docker-compose.yml "$@"; }

if ! compose up -d --force-recreate --wait --wait-timeout 60 landing; then
  echo "ERROR: ${ENV}-landing is not healthy — recent logs:" >&2
  compose logs --tail 60 landing || true
  if docker image inspect "${IMAGE}-prev" >/dev/null 2>&1; then
    echo "Rolling back to ${IMAGE}-prev" >&2
    docker tag "${IMAGE}-prev" "$IMAGE"
    compose up -d --force-recreate landing || true
  fi
  exit 1
fi

# Конфиг домена: HTTPS только когда сертификат реально есть (иначе nginx -t упадёт на всех сайтах сервера).
if docker exec "$NGINX_CONTAINER" test -f "/etc/letsencrypt/live/${CERT}/fullchain.pem"; then
  TPL=deploy/nginx/landing.https.conf.tpl
  MODE=https
else
  TPL=deploy/nginx/landing.http.conf.tpl
  MODE=http
fi

BACKUP=""
if [ -f "$CONF" ]; then
  BACKUP="${CONF}.bak"
  cp "$CONF" "$BACKUP"
fi
sed -e "s|__ENV__|${ENV}|g" -e "s|__DOMAINS__|${DOMAINS}|g" -e "s|__PRIMARY__|${PRIMARY}|g" -e "s|__CERT__|${CERT}|g" "$TPL" > "${CONF}.new"
mv "${CONF}.new" "$CONF"

if ! docker exec "$NGINX_CONTAINER" nginx -t; then
  echo "ERROR: nginx -t failed — restoring previous landing config" >&2
  if [ -n "$BACKUP" ]; then mv "$BACKUP" "$CONF"; else rm -f "$CONF"; fi
  exit 1
fi
docker exec "$NGINX_CONTAINER" nginx -s reload
rm -f "$BACKUP"

# Проверка снаружи контейнера: общий nginx отдаёт главную лендинга.
sleep 2
if [ "$MODE" = https ]; then
  CHECK="curl -fsS -o /dev/null --resolve ${PRIMARY}:443:127.0.0.1 https://${PRIMARY}/"
else
  CHECK="curl -fsS -o /dev/null -H Host:${PRIMARY} http://127.0.0.1/"
fi
if command -v curl >/dev/null 2>&1 && ! sh -c "$CHECK"; then
  echo "WARN: ${PRIMARY} не отвечает через общий nginx (проверьте DNS/сертификат)" >&2
fi

echo "=== Landing ${ENV} deployed (${MODE}) ==="
if [ "$MODE" = http ]; then
  cat <<EOF

Сертификата ${CERT} ещё нет: сайт отдаётся по HTTP. Когда DNS всех имён (${DOMAINS}) смотрит на этот сервер,
выпустите сертификат и запустите деплой ещё раз — он переключит домен на HTTPS:

  docker exec poker-club-manager-certbot certbot certonly --webroot -w /var/www/certbot \\
    --cert-name ${CERT} $(for d in $DOMAINS; do printf -- '-d %s ' "$d"; done)

EOF
fi

