# TRFC - Thika Road Fitness Community

MVP website for TRFC, a Kenyan fitness community based along Thika Road, Nairobi.

## Tech Stack

### Backend
- Node.js + Express.js (TypeScript)
- PostgreSQL
- JWT Authentication
- M-Pesa (Safaricom Daraja API)
- Cloudinary for image uploads
- Nodemailer (Gmail) for transactional emails
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

## Email (Nodemailer / Gmail)

Transactional mail (ticket and medal confirmations with PDF attachments) is sent via Nodemailer using a Gmail app password.

In `server/.env` (and production / Heroku config vars), set:

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

`EMAIL_PASS` is accepted as an alias for `EMAIL_PASSWORD`.

Copy `server/.env.example` for the full list of server env vars.
