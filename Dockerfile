FROM php:8.2-apache

# 1. Installiamo tutte le librerie Perl necessarie dal repository Debian
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    makepasswd \
    libauthen-ntlm-perl \
    libcgi-pm-perl \
    libcrypt-openssl-rsa-perl \
    libdata-uniqid-perl \
    libencode-imaputf7-perl \
    libfile-copy-recursive-perl \
    libfile-tail-perl \
    libio-socket-ssl-perl \
    libio-tee-perl \
    libjson-webtoken-perl \
    libmail-imapclient-perl \
    libparse-recdescent-perl \
    libmodule-scandeps-perl \
    libpar-packer-perl \
    libreadonly-perl \
    libsys-meminfo-perl \
    libsys-hostname-long-perl \
    libregexp-common-perl \
    libproc-processtable-perl \
    libterm-readkey-perl \
    libtest-mockobject-perl \
    libtest-pod-perl \
    libunicode-string-perl \
    liburi-perl \
    libwww-perl \
    && rm -rf /var/lib/apt/lists/*

# 2. Installiamo imapsync e forziamo i permessi
RUN wget https://imapsync.lamiral.info/imapsync \
    && cp imapsync /usr/bin/imapsync \
    && chmod +x /usr/bin/imapsync

# 3. Configurazione Apache: puntiamo alla cartella 'public'
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# 4. Abilitiamo mod_rewrite e settiamo i permessi per i log
RUN a2enmod rewrite && chmod 777 /tmp

WORKDIR /var/www/html