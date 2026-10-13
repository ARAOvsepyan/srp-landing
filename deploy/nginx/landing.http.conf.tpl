# Лендинг __PRIMARY__ (окружение __ENV__) БЕЗ сертификата: deploy/deploy.sh ставит этот вариант, пока в
# /etc/letsencrypt/live/__CERT__ нет сертификата. Отдаёт сайт по http и пропускает проверку Let's Encrypt.
# После выпуска сертификата (команда — в выводе деплоя и в README) следующий деплой переключит на HTTPS.

server {
    listen 80;
    server_name __DOMAINS__;

    resolver 127.0.0.11 valid=30s;
    set $landing http://__ENV__-landing:80;
    set $landing_backend http://__ENV__-backend:4000;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

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
    }
}
