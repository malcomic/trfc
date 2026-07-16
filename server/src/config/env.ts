import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    // BusinessShortCode: Paybill number, or Head Office (store) number for Buy Goods
    shortcode: process.env.MPESA_SHORTCODE || '',
    // PartyB for Buy Goods STK: the operating till number (defaults to shortcode)
    tillNumber: process.env.MPESA_TILL_NUMBER || '',
    // 'CustomerPayBillOnline' (paybill) or 'CustomerBuyGoodsOnline' (till).
    // Accepts shorthand values: till / buygoods / paybill
    transactionType: ['customerbuygoodsonline', 'buygoods', 'buy_goods', 'till'].includes(
      (process.env.MPESA_TRANSACTION_TYPE || '').trim().toLowerCase()
    )
      ? 'CustomerBuyGoodsOnline'
      : 'CustomerPayBillOnline',
    passkey: process.env.MPESA_PASSKEY || '',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
    // Normalize so 'Live', 'live', 'prod', 'PRODUCTION' etc. all count as production
    env: ['production', 'live', 'prod'].includes(
      (process.env.MPESA_ENV || 'sandbox').trim().toLowerCase()
    )
      ? 'production'
      : 'sandbox',
  },
  email: {
    user: process.env.EMAIL_USER || '',
    /** App password — prefer EMAIL_PASSWORD; EMAIL_PASS is supported as an alias */
    pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || '',
  },
  frontendUrl:
    process.env.FRONTEND_URL || 'https://trfc-website-d41f18cf654e.herokuapp.com',
  contact: {
    email:
      process.env.CONTACT_EMAIL ||
      process.env.VITE_CONTACT_EMAIL ||
      'thikaroadfitness@gmail.com',
    phone:
      process.env.CONTACT_PHONE ||
      process.env.VITE_CONTACT_PHONE ||
      '+254 762 550214',
  },
  afrikasTalking: {
    apiKey: process.env.AT_API_KEY || '',
    username: process.env.AT_USERNAME || 'sandbox',
  },
};

// Validate required env vars
const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = requiredVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.warn(`Missing required environment variables: ${missing.join(', ')}`);
}
