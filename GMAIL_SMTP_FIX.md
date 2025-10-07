# Gmail SMTP Authentication Fix

## Проблема
```
jakarta.mail.AuthenticationFailedException: 534-5.7.9 Please log in with your web browser
```

## Причина
Google заблокировал доступ из-за:
1. Нет двухфакторной аутентификации (2FA)
2. App Password неправильный или истёк
3. Недостаточно SMTP параметров для Gmail

## Решение

### Шаг 1: Включите 2FA в Google
1. Откройте: https://myaccount.google.com/security
2. Включите "Двухэтапная аутентификация"
3. Подтвердите через телефон

### Шаг 2: Создайте App Password
1. После включения 2FA откройте: https://myaccount.google.com/apppasswords
2. Создайте новый пароль: "AniWay Auth Service"
3. Скопируйте пароль (16 символов БЕЗ пробелов)

### Шаг 3: Обновите .env на сервере

```bash
cd ~/AniWay-Reload
nano .env
```

Добавьте:
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=artempronko241@gmail.com
MAIL_PASSWORD=your_16_char_app_password_here
MAIL_AUTH=true
MAIL_STARTTLS=true
MAIL_STARTTLS_REQUIRED=true
MAIL_SSL_TRUST=smtp.gmail.com
EMAIL_VERIFICATION_FROM=artempronko241@gmail.com
```

### Шаг 4: Пересоберите и запустите

```bash
# Пересобрать образ
docker-compose -f docker-compose.prod.yml build auth-service

# Перезапустить сервис
docker-compose -f docker-compose.prod.yml up -d auth-service

# Проверить логи
docker logs -f aniway-reload-auth-service-1 | grep -i "mail\|smtp"
```

### Шаг 5: Тестирование

Попробуйте залогиниться снова. Должны увидеть:
```
[INFO] Request code for existing email rombk2711@gmail.com
[INFO] Email sent successfully to rombk2711@gmail.com
```

## Если проблема остаётся

### Вариант A: Проверьте аккаунт Google
1. Откройте: https://myaccount.google.com/lesssecureapps
2. Убедитесь что НЕ включено (должно быть выключено)
3. Используйте ТОЛЬКО App Password, не обычный пароль

### Вариант B: Проверьте недавние попытки входа
1. Откройте: https://myaccount.google.com/notifications
2. Если есть заблокированные попытки - разрешите доступ

### Вариант C: Используйте другой SMTP провайдер

#### SendGrid (бесплатно 100 писем/день)
```env
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your_sendgrid_api_key
MAIL_AUTH=true
MAIL_STARTTLS=true
```

Регистрация: https://signup.sendgrid.com/

#### Mailgun (бесплатно 5000 писем/месяц)
```env
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@your-domain.mailgun.org
MAIL_PASSWORD=your_mailgun_password
MAIL_AUTH=true
MAIL_STARTTLS=true
```

Регистрация: https://signup.mailgun.com/

## Добавленные SMTP параметры

В `application.properties` и `docker-compose.prod.yml`:

```properties
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.ssl.trust=smtp.gmail.com
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000
```

Эти параметры:
- ✅ Требуют STARTTLS (обязательно для Gmail)
- ✅ Доверяют сертификату Gmail
- ✅ Устанавливают таймауты (5 секунд)

## Полезные команды для отладки

```bash
# Проверить переменные окружения в контейнере
docker exec aniway-reload-auth-service-1 env | grep MAIL

# Проверить подключение к Gmail SMTP
docker exec -it aniway-reload-auth-service-1 sh
telnet smtp.gmail.com 587

# Логи только email
docker logs aniway-reload-auth-service-1 2>&1 | grep -i email

# Перезапустить с очисткой
docker-compose -f docker-compose.prod.yml down auth-service
docker-compose -f docker-compose.prod.yml up -d auth-service
```

## Итоговый чеклист

- [ ] 2FA включена в Google аккаунте
- [ ] App Password создан (16 символов)
- [ ] `.env` обновлён с правильным паролем
- [ ] `application.properties` содержит новые SMTP параметры
- [ ] `docker-compose.prod.yml` содержит новые переменные окружения
- [ ] AuthService пересобран: `docker-compose build auth-service`
- [ ] AuthService перезапущен: `docker-compose up -d auth-service`
- [ ] Логи показывают успешную отправку email

## Ожидаемый результат

**До:**
```
ERROR Failed to send verification email: Authentication failed
Caused by: jakarta.mail.AuthenticationFailedException: 534-5.7.9 Please log in...
```

**После:**
```
INFO Request code for existing email rombk2711@gmail.com
INFO Verification email sent successfully to rombk2711@gmail.com
DEBUG SMTP connection established to smtp.gmail.com:587
```
