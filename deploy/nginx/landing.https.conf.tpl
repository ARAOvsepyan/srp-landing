# Лендинг __PRIMARY__ (окружение __ENV__). Ставит deploy/deploy.sh в общий nginx сервера СРП:
# /opt/poker_club_manager/nginx/conf.d/landing-__ENV__.conf. Руками на сервере не править — перезапишется.
#
#   статика           → __ENV__-landing:80 (контейнер лендинга)
#   форма заявки      → __ENV__-backend:4000, только POST /api/public/franchise-leads
#   остальное /api/   → 404 (CRM живёт на своих доменах)

server {
    listen 80;
    server_name __DOMAINS__;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://__PRIMARY__$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name __DOMAINS__;

    ssl_certificate /etc/letsencrypt/live/__CERT__/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/__CERT__/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    resolver 127.0.0.11 valid=30s;
    set $landing http://__ENV__-landing:80;
    set $landing_backend http://__ENV__-backend:4000;

    # www и прочие имена — на основной адрес
    if ($host != "__PRIMARY__") {
        return 301 https://__PRIMARY__$request_uri;
    }

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Форма «Оставить заявку»: тот же домен, без CORS. Лимит запросов — на бэкенде (по X-Forwarded-For).
    location = /api/public/franchise-leads {
        limit_except POST { deny all; }
        proxy_pass $landing_backend$request_uri;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 16k;
        add_header Cache-Control "no-store" always;
    }

    location /api/ {
        return 404;
    }

    location / {
        proxy_pass $landing;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_intercept_errors off;
    }
}
