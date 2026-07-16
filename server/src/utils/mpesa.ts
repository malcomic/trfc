import axios from 'axios'
import crypto from 'crypto'
import { config } from '../config/env.js'

const SANDBOX_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate'
const SANDBOX_STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
const SANDBOX_QUERY_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
const PROD_AUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate'
const PROD_STK_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
const PROD_QUERY_URL = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'

export async function getMPesaToken(): Promise<string> {
  try {
    const auth = Buffer.from(
      `${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`
    ).toString('base64')

    const { auth: authUrl } = getUrls()
    const response = await axios.get(authUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      params: {
        grant_type: 'client_credentials',
      },
    })

    return response.data.access_token
  } catch (error) {
    console.error('Error getting MPesa token:', error)
    throw error
  }
}

export function generatePassword(timestamp: string): string {
  const password = Buffer.from(
    `${config.mpesa.shortcode}${config.mpesa.passkey}${timestamp}`
  ).toString('base64')
  return password
}

export function getTimestamp(): string {
  const now = new Date()
  return (
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  )
}

function getUrls() {
  const isProd = config.mpesa.env === 'production'
  return {
    auth: isProd ? PROD_AUTH_URL : SANDBOX_AUTH_URL,
    stkPush: isProd ? PROD_STK_URL : SANDBOX_STK_URL,
    query: isProd ? PROD_QUERY_URL : SANDBOX_QUERY_URL,
  }
}

export interface STKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export interface CallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{
          Name: string
          Value: string | number
        }>
      }
    }
  }
}

export async function initiateStkPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string,
  token: string
): Promise<STKPushResponse> {
  try {
    const timestamp = getTimestamp()
    const password = generatePassword(timestamp)
    const urls = getUrls()

    // Buy Goods (till) STK: BusinessShortCode is the Head Office/store number,
    // PartyB is the operating till number. Paybill uses the shortcode for both.
    const partyB =
      config.mpesa.transactionType === 'CustomerBuyGoodsOnline' && config.mpesa.tillNumber
        ? config.mpesa.tillNumber
        : config.mpesa.shortcode

    const response = await axios.post(
      urls.stkPush,
      {
        BusinessShortCode: config.mpesa.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: config.mpesa.transactionType,
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: partyB,
        PhoneNumber: phoneNumber,
        CallBackURL: config.mpesa.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    return response.data
  } catch (error) {
    console.error('Error initiating STK push:', error)
    throw error
  }
}

export async function queryPaymentStatus(
  checkoutRequestId: string,
  token: string
): Promise<any> {
  try {
    const timestamp = getTimestamp()
    const password = generatePassword(timestamp)
    const urls = getUrls()

    const response = await axios.post(
      urls.query,
      {
        BusinessShortCode: config.mpesa.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    return response.data
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown }; message?: string }
    if (axiosError.response?.data) {
      console.error('M-Pesa status query error response:', axiosError.response.data)
    } else {
      console.error('Error querying payment status:', axiosError.message ?? error)
    }
    throw error
  }
}

export function validateCallback(
  payload: any,
  receivedSignature: string
): boolean {
  if (!config.mpesa.callbackUrl) {
    console.error('MPESA_CALLBACK_URL not configured')
    return false
  }

  const payloadString = JSON.stringify(payload)
  const computedSignature = crypto
    .createHmac('sha256', config.mpesa.consumerSecret)
    .update(payloadString)
    .digest('base64')

  return computedSignature === receivedSignature
}

export function parseCallbackResponse(body: CallbackPayload): {
  merchantRequestId: string
  checkoutRequestId: string
  resultCode: number
  resultDesc: string
  mpesaReceiptNumber?: string
  transactionAmount?: number
  transactionDate?: string
  phoneNumber?: string
} {
  const callback = body.Body.stkCallback
  const items = callback.CallbackMetadata?.Item || []

  const itemMap: Record<string, string | number> = {}
  items.forEach((item: any) => {
    itemMap[item.Name] = item.Value
  })

  return {
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    mpesaReceiptNumber: itemMap.MpesaReceiptNumber as string | undefined,
    transactionAmount: itemMap.Amount as number | undefined,
    transactionDate: itemMap.TransactionDate as string | undefined,
    phoneNumber: itemMap.PhoneNumber as string | undefined,
  }
}
