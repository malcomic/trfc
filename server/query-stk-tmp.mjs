// Temporary diagnostic: query Daraja STK status for a checkout ID (read-only)
import axios from 'axios'

const consumerKey = process.env.MPESA_CONSUMER_KEY
const consumerSecret = process.env.MPESA_CONSUMER_SECRET
const shortcode = process.env.MPESA_SHORTCODE
const passkey = process.env.MPESA_PASSKEY
const checkoutId = process.argv[2]

if (!checkoutId) {
  console.error('Usage: node query-stk-tmp.mjs <CheckoutRequestID>')
  process.exit(1)
}

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

const tokenRes = await axios.get(
  'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  { headers: { Authorization: `Basic ${auth}` } }
)
const token = tokenRes.data.access_token

const now = new Date()
const ts =
  now.getFullYear() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0') +
  String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0')
const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString('base64')

try {
  const res = await axios.post(
    'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      CheckoutRequestID: checkoutId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  console.log(JSON.stringify(res.data, null, 2))
} catch (e) {
  console.log('QUERY_ERROR', JSON.stringify(e.response?.data || e.message, null, 2))
}
