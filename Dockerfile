FROM php:8.3-fpm-bullseye

# 1. Installazione delle dipendenze Perl (Aggiunto libio-tee-perl)
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    procps \
    iproute2 \
    makepasswd \
    libauthen-ntlm-perl \
    libclass-singleton-perl \
    libcrypt-openssl-rsa-perl \
    libdata-uniqid-perl \
    libdigest-hmac-perl \
    libdist-checkconflicts-perl \
    libencode-imaputf7-perl \
    libfile-copy-recursive-perl \
    libfile-tail-perl \
    libio-socket-inet6-perl \
    libio-socket-ssl-perl \
    libio-tee-perl \
    libjson-webtoken-perl \
    libmail-imapclient-perl \
    libmodule-scandeps-perl \
    libnet-dbus-perl \
    libnet-ssleay-perl \
    libparse-recdescent-perl \
    libproc-processtable-perl \
    libreadonly-perl \
    libregexp-common-perl \
    libsys-meminfo-perl \
    libterm-readkey-perl \
    libtest-fatal-perl \
    libtest-mockobject-perl \
    libtest-pod-perl \
    libtest-requires-perl \
    libtest-simple-perl \
    libtest-warn-perl \
    libtime-hires-perl \
    libunicode-string-perl \
    liburi-perl \
    libwww-perl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# 2. Scaricamento e installazione manuale di imapsync
RUN wget https://imapsync.lamiral.info/imapsync \
    && cp imapsync /usr/bin/imapsync \
    && chmod +x /usr/bin/imapsync

WORKDIR /var/www/html

COPY . .

# Creazione cartella log e permessi
RUN mkdir -p logs && chown -R www-data:www-data /var/www/html && chmod -R 775 logs

EXPOSE 80

RUN rm /etc/nginx/sites-enabled/default || true
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod 1777 /tmp

CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]