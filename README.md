# TRFC - Thika Road Fitness Community

MVP website for TRFC, a Kenyan fitness community based along Thika Road, Nairobi.

## Tech Stack

### Backend
- Node.js + Express.js (TypeScript)
- PostgreSQL
- JWT Authentication
- M-Pesa (Safaricom Daraja API)
- Cloudinary for image uploads
- Nodemailer for emails
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
