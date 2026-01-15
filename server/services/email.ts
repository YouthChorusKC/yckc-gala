import { Resend } from 'resend'
import { getDb, generateId } from '../db.js'

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, emails will be skipped')
    return null
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'YCKC Gala <info@youthchoruskc.org>'

interface OrderDetails {
  id: string
  customer_email: string
  customer_name: string | null
  customer_phone: string | null
  total_cents: number
  donation_cents: number
  payment_method: 'card' | 'check'
  items: Array<{
    product_name: string
    quantity: number
    unit_price_cents: number
    category: string
  }>
}

interface EmailLogEntry {
  order_id: string | null
  recipient: string
  email_type: string
  subject: string
  resend_id?: string
  status: 'sent' | 'failed'
  error?: string
}

async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    const db = getDb()
    db.prepare(`
      INSERT INTO email_log (id, order_id, recipient, email_type, subject, resend_id, status, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId(),
      entry.order_id,
      entry.recipient,
      entry.email_type,
      entry.subject,
      entry.resend_id || null,
      entry.status,
      entry.error || null
    )
  } catch (err) {
    console.error('Failed to log email:', err)
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function generateReceiptHtml(order: OrderDetails, isCheckPayment: boolean): string {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCents(item.unit_price_cents * item.quantity)}</td>
    </tr>
  `).join('')

  const donationRow = order.donation_cents > 0 ? `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">Additional Donation</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">-</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCents(order.donation_cents)}</td>
    </tr>
  ` : ''

  const checkInstructions = isCheckPayment ? `
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; color: #856404;">Payment Instructions</h3>
      <p style="margin: 0 0 12px 0; color: #856404;">
        Please mail your check to:
      </p>
      <p style="margin: 0; color: #856404; font-weight: bold;">
        Youth Chorus of Kansas City<br>
        PO Box 414902<br>
        Kansas City, MO 64141
      </p>
      <p style="margin: 12px 0 0 0; color: #856404; font-size: 14px;">
        Make check payable to: Youth Chorus of Kansas City<br>
        Reference: Order #${order.id.slice(0, 8).toUpperCase()}
      </p>
    </div>
  ` : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a365d; margin: 0;">A Sky Full of Stars</h1>
    <p style="color: #666; margin: 5px 0;">Youth Chorus of Kansas City</p>
    <p style="color: #666; margin: 5px 0;">Annual Fundraiser Gala</p>
  </div>

  <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 16px 0; color: #1a365d;">
      ${isCheckPayment ? 'Order Received!' : 'Thank You for Your Purchase!'}
    </h2>

    <p style="margin: 0 0 12px 0;">
      Dear ${order.customer_name || 'Valued Supporter'},
    </p>

    <p style="margin: 0;">
      ${isCheckPayment
        ? 'We have received your order for the YCKC Annual Gala. Please see payment instructions below.'
        : 'Thank you for your purchase! We look forward to seeing you at the YCKC Annual Gala.'
      }
    </p>
  </div>

  ${checkInstructions}

  <div style="margin: 20px 0;">
    <h3 style="color: #1a365d; margin: 0 0 16px 0;">Order Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #1a365d; color: white;">
          <th style="padding: 12px; text-align: left;">Item</th>
          <th style="padding: 12px; text-align: center;">Qty</th>
          <th style="padding: 12px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        ${donationRow}
      </tbody>
      <tfoot>
        <tr style="background: #f8f9fa; font-weight: bold;">
          <td colspan="2" style="padding: 12px;">Total</td>
          <td style="padding: 12px; text-align: right;">${formatCents(order.total_cents)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div style="background: #e8f4f8; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px;">
      <strong>Order Reference:</strong> ${order.id.slice(0, 8).toUpperCase()}<br>
      <strong>Email:</strong> ${order.customer_email}
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Youth Chorus of Kansas City<br>
      <a href="https://youthchoruskc.org" style="color: #c9a227;">youthchoruskc.org</a>
    </p>
    <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
      Questions? Contact us at ryan@youthchoruskc.org
    </p>
  </div>
</body>
</html>
  `
}

function generatePaymentReceivedHtml(order: OrderDetails): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a365d; margin: 0;">A Sky Full of Stars</h1>
    <p style="color: #666; margin: 5px 0;">Youth Chorus of Kansas City</p>
  </div>

  <div style="background: #d4edda; border: 1px solid #28a745; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 16px 0; color: #155724;">Payment Received!</h2>

    <p style="margin: 0 0 12px 0; color: #155724;">
      Dear ${order.customer_name || 'Valued Supporter'},
    </p>

    <p style="margin: 0; color: #155724;">
      We have received your payment of <strong>${formatCents(order.total_cents)}</strong> for order #${order.id.slice(0, 8).toUpperCase()}.
    </p>
  </div>

  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin: 0 0 12px 0; color: #1a365d;">What's Next?</h3>
    <p style="margin: 0; color: #666;">
      Your tickets/sponsorship are now confirmed. We'll send you more information about the event as we get closer to the date.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="color: #666; font-size: 14px; margin: 0;">
      Youth Chorus of Kansas City<br>
      <a href="https://youthchoruskc.org" style="color: #c9a227;">youthchoruskc.org</a>
    </p>
    <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
      Questions? Contact us at ryan@youthchoruskc.org
    </p>
  </div>
</body>
</html>
  `
}

export async function sendPurchaseReceipt(order: OrderDetails): Promise<boolean> {
  const client = getResend()
  if (!client) {
    console.log('Email skipped (no API key):', order.customer_email)
    return false
  }

  const isCheckPayment = order.payment_method === 'check'
  const subject = isCheckPayment
    ? 'YCKC Gala - Order Received (Payment Pending)'
    : 'YCKC Gala - Order Confirmation'

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject,
      html: generateReceiptHtml(order, isCheckPayment),
    })

    if (error) {
      console.error('Failed to send receipt:', error)
      await logEmail({
        order_id: order.id,
        recipient: order.customer_email,
        email_type: 'purchase_receipt',
        subject,
        status: 'failed',
        error: error.message,
      })
      return false
    }

    await logEmail({
      order_id: order.id,
      recipient: order.customer_email,
      email_type: 'purchase_receipt',
      subject,
      resend_id: data?.id,
      status: 'sent',
    })

    console.log('Receipt sent to:', order.customer_email)
    return true
  } catch (err: any) {
    console.error('Email error:', err)
    await logEmail({
      order_id: order.id,
      recipient: order.customer_email,
      email_type: 'purchase_receipt',
      subject,
      status: 'failed',
      error: err.message,
    })
    return false
  }
}

export async function sendPaymentReceived(order: OrderDetails): Promise<boolean> {
  const client = getResend()
  if (!client) {
    console.log('Email skipped (no API key):', order.customer_email)
    return false
  }

  const subject = 'YCKC Gala - Payment Confirmed'

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: order.customer_email,
      subject,
      html: generatePaymentReceivedHtml(order),
    })

    if (error) {
      console.error('Failed to send payment confirmation:', error)
      await logEmail({
        order_id: order.id,
        recipient: order.customer_email,
        email_type: 'payment_received',
        subject,
        status: 'failed',
        error: error.message,
      })
      return false
    }

    await logEmail({
      order_id: order.id,
      recipient: order.customer_email,
      email_type: 'payment_received',
      subject,
      resend_id: data?.id,
      status: 'sent',
    })

    console.log('Payment confirmation sent to:', order.customer_email)
    return true
  } catch (err: any) {
    console.error('Email error:', err)
    await logEmail({
      order_id: order.id,
      recipient: order.customer_email,
      email_type: 'payment_received',
      subject,
      status: 'failed',
      error: err.message,
    })
    return false
  }
}

export async function sendAdminNotification(order: OrderDetails): Promise<boolean> {
  const client = getResend()
  const adminEmail = process.env.ADMIN_EMAIL || 'ryan@youthchoruskc.org'

  if (!client) {
    console.log('Admin notification skipped (no API key)')
    return false
  }

  const subject = `New Gala Order: ${formatCents(order.total_cents)} from ${order.customer_name || order.customer_email}`

  const itemsList = order.items.map(i => `- ${i.product_name} x${i.quantity}: ${formatCents(i.unit_price_cents * i.quantity)}`).join('\n')

  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject,
      html: `
        <h2>New Gala Order</h2>
        <p><strong>Customer:</strong> ${order.customer_name || '(not provided)'}</p>
        <p><strong>Email:</strong> ${order.customer_email}</p>
        <p><strong>Phone:</strong> ${order.customer_phone || '(not provided)'}</p>
        <p><strong>Payment:</strong> ${order.payment_method === 'check' ? 'Check (pending)' : 'Credit Card'}</p>
        <h3>Items</h3>
        <pre>${itemsList}</pre>
        ${order.donation_cents > 0 ? `<p><strong>Additional Donation:</strong> ${formatCents(order.donation_cents)}</p>` : ''}
        <p><strong>Total:</strong> ${formatCents(order.total_cents)}</p>
        <hr>
        <p><a href="${process.env.BASE_URL}/admin/orders">View in Admin</a></p>
      `,
    })

    if (error) {
      console.error('Failed to send admin notification:', error)
      return false
    }

    console.log('Admin notification sent')
    return true
  } catch (err) {
    console.error('Admin notification error:', err)
    return false
  }
}

export async function sendCustomEmail(
  to: string,
  subject: string,
  html: string,
  orderId?: string
): Promise<boolean> {
  const client = getResend()
  if (!client) {
    console.log('Email skipped (no API key):', to)
    return false
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Failed to send custom email:', error)
      await logEmail({
        order_id: orderId || null,
        recipient: to,
        email_type: 'custom',
        subject,
        status: 'failed',
        error: error.message,
      })
      return false
    }

    await logEmail({
      order_id: orderId || null,
      recipient: to,
      email_type: 'custom',
      subject,
      resend_id: data?.id,
      status: 'sent',
    })

    return true
  } catch (err: any) {
    console.error('Email error:', err)
    return false
  }
}
