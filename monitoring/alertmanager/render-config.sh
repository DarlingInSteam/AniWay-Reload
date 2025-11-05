#!/bin/sh
set -eu

TEMPLATE=/etc/alertmanager/alertmanager.yml.tpl
OUTPUT=/etc/alertmanager/alertmanager.yml

escape() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g' -e 's/\\/\\\\/g'
}

SMTP_HOST=$(escape "${ALERTMANAGER_SMTP_HOST}")
SMTP_PORT=$(escape "${ALERTMANAGER_SMTP_PORT}")
EMAIL_FROM=$(escape "${ALERTMANAGER_EMAIL_FROM}")
EMAIL_TO=$(escape "${ALERTMANAGER_EMAIL_TO}")
SMTP_USERNAME=$(escape "${ALERTMANAGER_SMTP_USERNAME}")
SMTP_PASSWORD=$(escape "${ALERTMANAGER_SMTP_PASSWORD}")
TELEGRAM_BOT_TOKEN=$(escape "${ALERTMANAGER_TELEGRAM_BOT_TOKEN}")
TELEGRAM_CHAT_ID=$(escape "${ALERTMANAGER_TELEGRAM_CHAT_ID}")

sed \
  -e "s|\${ALERTMANAGER_SMTP_HOST}|$SMTP_HOST|g" \
  -e "s|\${ALERTMANAGER_SMTP_PORT}|$SMTP_PORT|g" \
  -e "s|\${ALERTMANAGER_EMAIL_FROM}|$EMAIL_FROM|g" \
  -e "s|\${ALERTMANAGER_EMAIL_TO}|$EMAIL_TO|g" \
  -e "s|\${ALERTMANAGER_SMTP_USERNAME}|$SMTP_USERNAME|g" \
  -e "s|\${ALERTMANAGER_SMTP_PASSWORD}|$SMTP_PASSWORD|g" \
  -e "s|\${ALERTMANAGER_TELEGRAM_BOT_TOKEN}|$TELEGRAM_BOT_TOKEN|g" \
  -e "s|\${ALERTMANAGER_TELEGRAM_CHAT_ID}|$TELEGRAM_CHAT_ID|g" \
  "$TEMPLATE" > "$OUTPUT"

exec /bin/alertmanager "$@"
