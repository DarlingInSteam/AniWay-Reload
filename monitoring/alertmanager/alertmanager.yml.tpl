global:
  resolve_timeout: 5m
  smtp_smarthost: "${ALERTMANAGER_SMTP_HOST}:${ALERTMANAGER_SMTP_PORT}"
  smtp_from: "${ALERTMANAGER_EMAIL_FROM}"
  smtp_auth_username: "${ALERTMANAGER_SMTP_USERNAME}"
  smtp_auth_password: "${ALERTMANAGER_SMTP_PASSWORD}"
  smtp_require_tls: true

route:
  receiver: email-default
  group_by: ['alertname', 'service', 'instance']
  group_wait: 30s
  group_interval: 2m
  repeat_interval: 4h
  routes:
    - receiver: telegram-critical
      matchers:
        - severity = "critical"
      continue: true

receivers:
  - name: email-default
    email_configs:
      - to: "${ALERTMANAGER_EMAIL_TO}"
        html: '{{ template "aniway.default.html" . }}'
        headers:
          Subject: "[Aniway][{{ .Status }}] {{ .CommonLabels.alertname }}"
          Reply-To: "${ALERTMANAGER_EMAIL_FROM}"
  - name: telegram-critical
    telegram_configs:
      - bot_token: "${ALERTMANAGER_TELEGRAM_BOT_TOKEN}"
        chat_id: ${ALERTMANAGER_TELEGRAM_CHAT_ID}
        api_url: https://api.telegram.org
        parse_mode: Markdown
        message: '{{ template "aniway.telegram.message" . }}'
        disable_notifications: false
templates:
  - /etc/alertmanager/templates/*.tmpl
