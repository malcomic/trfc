# TRFC - Thika Road Fitness Community

MVP website for TRFC, a Kenyan fitness community based along Thika Road, Nairobi.

## Tech Stack

### Backend
- Node.js + Express.js (TypeScript)
- PostgreSQL
- JWT Authentication
- M-Pesa (Safaricom Daraja API)
- Cloudinary for image uploads
- Resend for transactional emails
- Africa's Talking SDK for SMS

### Frontend
- React 18 + Vite (TypeScript)
- React Router DOM
- Tailwind CSS
- Axios
- React Hook Form
- Zustand for state management

## Project Structure

```
├── server/
│   ├── src/
│   │   ├── config/        # Configuration files (DB, env)
│   │   ├── middleware/    # Express middleware (auth, admin)
│   │   ├── routes/        # API routes
│   │   ├── controllers/   # Route controllers
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utilities (M-Pesa, Cloudinary)
│   │   └── server.ts      # Entry point
│   ├── schema.sql         # Database schema
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   │   ├── api/           # API client modules
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React Context (Auth, Cart)
│   │   ├── store/         # Zustand stores
│   │   ├── types/         # TypeScript types
│   │   ├── App.tsx        # Entry component
│   │   └── main.tsx       # Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md

## Email (Resend)

Transactional mail (ticket confirmations with PDF attachments) is sent via [Resend](https://resend.com).

1. Create a Resend account and API key at https://resend.com/api-keys
2. Add and verify a sending domain (SPF/DKIM in DNS). Until verified, you can use `TRFC <onboarding@resend.dev>` and only send to your own inbox.
3. In `server/.env` (and production config / Heroku config vars), set:

```
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM="TRFC <tickets@yourdomain.com>"
```

Copy `server/.env.example` for the full list of server env vars.
