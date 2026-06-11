# RMC Telegram Bot

## Setup

```bash
cd bot
cp .env.example .env
npm install
npm start
```

Required:

- `TELEGRAM_BOT_TOKEN` from BotFather
- Postgres env values matching the CRM backend database

## Behavior

- `Ro'yhatdan o'tish` saves a pending registration in `telegram_student_registrations`.
- Registration does not create a real `students` row. It is intentionally stored in a separate table.
- `Kirish` authenticates against active CRM students using `username` + password.
- `Darslar` lists the groups/classes connected to that student account.
- Choosing a class shows performance for that student in that class.
- `Oxirgi dars` shows the latest session details, scores, attendance, and coins for the selected class.
