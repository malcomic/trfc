import { query } from '../config/db.js'
import { config } from '../config/env.js'
import { sendEmail } from './emailService.js'
import {
  buildMedalBatchEmailHTML,
  buildMedalBatchEmailText,
} from './emailTemplates.js'
import {
  generateMedalQRCodeBuffer,
  shortMedalCode,
} from './qrCodeGenerator.js'
import { generateMedalPDF } from './medalPDFGenerator.js'

function displayName(
  buyerName: string | null | undefined,
  userName: string | null | undefined,
  email: string
): string {
  if (buyerName && buyerName.trim()) return buyerName.trim()
  if (userName && userName.trim() && userName !== 'Guest') return userName.trim()
  const local = email.split('@')[0]
  return local || 'there'
}

/**
 * Send one confirmation email for all paid medal purchases under a payment reference.
 */
export async function sendMedalBatchEmail(reference: string): Promise<void> {
  try {
    const result = await query(
      `SELECT
        p.id, p.user_id, p.phone, p.email as purchase_email,
        p.buyer_name, p.mpesa_receipt, p.checkout_request_id,
        COALESCE(u.email, p.email) as email,
        COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
        o.distance_km, o.price,
        t.name as tier_name, t.slug as tier_slug
       FROM medal_purchases p
       LEFT JOIN users u ON p.user_id = u.id
       JOIN medal_options o ON p.medal_option_id = o.id
       JOIN medal_tiers t ON o.tier_id = t.id
       WHERE p.checkout_request_id = $1 AND p.payment_status = 'paid'
       ORDER BY p.created_at ASC`,
      [reference]
    )

    if (result.rows.length === 0) {
      console.error(`⚠️  No paid medal purchases found for email batch reference: ${reference}`)
      return
    }

    const rows = result.rows
    const email = rows[0].email as string | null
    if (!email) {
      console.error(`⚠️  No email for medal batch reference ${reference}`)
      return
    }

    const userName = displayName(rows[0].buyer_name, rows[0].user_name, email)
    const tierName = rows[0].tier_name as string
    const distanceKm = Number(rows[0].distance_km)
    const pricePerMedal = parseFloat(rows[0].price)
    const quantity = rows.length
    const totalPaid = Math.round(pricePerMedal * quantity)
    const mpesaReceipt = (rows[0].mpesa_receipt as string) || null

    const attachments: Array<{
      filename: string
      content: Buffer
      contentType: string
    }> = []

    const purchasesMeta: { purchaseId: string; shortCode: string }[] = []

    for (const purchase of rows) {
      const buyer = displayName(purchase.buyer_name, purchase.user_name, email)
      const shortCode = shortMedalCode(purchase.id)
      const qrCodeBuffer = await generateMedalQRCodeBuffer({
        purchaseId: purchase.id,
        tierSlug: purchase.tier_slug,
        distanceKm: Number(purchase.distance_km),
      })

      const pdfBuffer = await generateMedalPDF({
        purchaseId: purchase.id,
        shortCode,
        tierName,
        distanceKm: Number(purchase.distance_km),
        unitPrice: pricePerMedal,
        buyerName: buyer,
        buyerPhone: purchase.phone || '',
        mpesaReceipt: purchase.mpesa_receipt || mpesaReceipt,
        supportEmail: config.contact.email,
        supportPhone: config.contact.phone,
        qrCodeBuffer,
      })

      attachments.push({
        filename: `medal-${shortCode}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      })
      purchasesMeta.push({ purchaseId: purchase.id, shortCode })
    }

    const confirmationUrl = `${config.frontendUrl}/medal-confirmation/${encodeURIComponent(
      reference
    )}?email=${encodeURIComponent(email)}`

    const templateData = {
      userEmail: email,
      userName,
      tierName,
      distanceKm,
      pricePerMedal,
      quantity,
      totalPaid,
      paymentReference: reference,
      mpesaReceipt,
      purchases: purchasesMeta,
      confirmationUrl,
    }

    const subject =
      quantity > 1
        ? `Your TRFC medals — ${tierName} (${distanceKm} km)`
        : `Your TRFC medal — ${tierName} (${distanceKm} km)`

    const emailResult = await sendEmail({
      to: email,
      subject,
      html: buildMedalBatchEmailHTML(templateData),
      text: buildMedalBatchEmailText(templateData),
      attachments,
    })

    if (emailResult.success) {
      console.log(
        `✅ Medal batch email sent to ${email} for reference ${reference} (${quantity} medal(s), messageId=${emailResult.messageId})`
      )
    } else {
      console.error(
        `⚠️  Failed to send medal batch email to ${email} for reference ${reference}: ${emailResult.error}`
      )
    }
  } catch (error: any) {
    console.error(
      `⚠️  Error in sendMedalBatchEmail for ${reference}: ${error.message}`
    )
  }
}
