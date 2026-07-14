import axios from 'axios'
import crypto from 'crypto'
import { config } from '../config/env.js'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    id: number
    status: string
    reference: string
    amount: number
    currency: string
    paid_at: string | null
    channel: string
    metadata?: {
      ticketBatchId?: string
      accountReference?: string
      [key: string]: unknown
    }
  }
}

function authHeaders() {
  return {
    Authorization: `Bearer ${config.paystack.secretKey}`,
    'Content-Type': 'application/json',
  }
}

export async function initializeTransaction(params: {
  email: string
  amountKes: number
  reference?: string
  metadata?: Record<string, unknown>
  callbackUrl?: string
}): Promise<PaystackInitializeResponse['data']> {
  const amountKobo = Math.round(params.amountKes) * 100

  const response = await axios.post<PaystackInitializeResponse>(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    {
      email: params.email,
      amount: amountKobo,
      currency: 'KES',
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callbackUrl,
    },
    { headers: authHeaders() }
  )

  if (!response.data.status || !response.data.data) {
    throw new Error(response.data.message || 'Failed to initialize Paystack transaction')
  }

  return response.data.data
}

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse['data']> {
  const response = await axios.get<PaystackVerifyResponse>(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: authHeaders() }
  )

  if (!response.data.status || !response.data.data) {
    throw new Error(response.data.message || 'Failed to verify Paystack transaction')
  }

  return response.data.data
}

export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string | undefined
): boolean {
  if (!signature || !config.paystack.secretKey) {
    return false
  }

  const hash = crypto
    .createHmac('sha512', config.paystack.secretKey)
    .update(rawBody)
    .digest('hex')

  return hash === signature
}
