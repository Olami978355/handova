import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/utils.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailPayload {
  to: string
  subject: string
  template: 'welcome' | 'verification_status' | 'inspection_booked' | 'deal_update' | 'refund' | 'dispute'
  data: Record<string, any>
}

const getTemplate = (template: string, data: Record<string, any>) => {
  const brandColor = '#1a6b3c';
  const accentColor = '#f0c040';

  const baseLayout = (content: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: 900; color: ${brandColor}; text-decoration: none; }
          .content { background: #ffffff; border-radius: 24px; padding: 40px; border: 1px solid #f0f0f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
          .button { display: inline-block; background: ${brandColor}; color: #ffffff !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 24px; }
          .highlight { color: ${brandColor}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="https://handova.ng" class="logo">RentEasy</a>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            &copy; 2024 Rent Easy Nigeria. All rights reserved.<br>
            Lagos, Nigeria
          </div>
        </div>
      </body>
    </html>
  `;

  switch (template) {
    case 'welcome':
      return baseLayout(`
        <h1>Welcome to Rent Easy, ${data.name}!</h1>
        <p>We're excited to have you join Nigeria's most trusted real estate platform.</p>
        <p>Whether you're looking for a new home or listing a property, we've got you covered with our secure escrow system and verified listings.</p>
        <a href="${data.link}" class="button">Get Started</a>
      `);
    
    case 'verification_status':
      return baseLayout(`
        <h1>Verification Update</h1>
        <p>Hello ${data.name},</p>
        <p>Your verification request has been <span class="highlight">${data.status}</span>.</p>
        ${data.status === 'approved' 
          ? '<p>Congratulations! You now have a verified badge on your profile and listings.</p>' 
          : `<p>Reason: ${data.reason}</p><p>Please update your documents and try again.</p>`}
        <a href="${data.link}" class="button">View Profile</a>
      `);

    case 'inspection_booked':
      return baseLayout(`
        <h1>New Inspection Booking</h1>
        <p>Hello ${data.name},</p>
        <p>A new inspection has been booked for <span class="highlight">${data.propertyTitle}</span>.</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Time:</strong> ${data.time}</p>
        <a href="${data.link}" class="button">Manage Booking</a>
      `);

    case 'deal_update':
      return baseLayout(`
        <h1>Deal Update: ${data.propertyTitle}</h1>
        <p>Hello ${data.name},</p>
        <p>The status of your deal has changed to <span class="highlight">${data.status}</span>.</p>
        <p>${data.message}</p>
        <a href="${data.link}" class="button">View Deal Details</a>
      `);

    case 'refund':
      return baseLayout(`
        <h1>Refund Processed</h1>
        <p>Hello ${data.name},</p>
        <p>A refund of <span class="highlight">₦${data.amount}</span> has been processed for your booking at ${data.propertyTitle}.</p>
        <p>The funds should appear in your account within 3-5 business days.</p>
        <a href="${data.link}" class="button">View Transaction</a>
      `);

    case 'dispute':
      return baseLayout(`
        <h1>Dispute Opened</h1>
        <p>Hello ${data.name},</p>
        <p>A dispute has been opened regarding the deal for <span class="highlight">${data.propertyTitle}</span>.</p>
        <p>Our moderators are reviewing the case and will contact you shortly.</p>
        <a href="${data.link}" class="button">View Dispute</a>
      `);

    default:
      return baseLayout(`
        <h1>${data.title || 'Notification from Rent Easy'}</h1>
        <p>${data.body || 'You have a new update on Rent Easy.'}</p>
        ${data.link ? `<a href="${data.link}" class="button">View Details</a>` : ''}
      `);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, template, data } = await req.json() as EmailPayload

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not set')
    }

    const html = getTemplate(template, data)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'RentEasy <notifications@renteasy.ng>',
        to: [to],
        subject: subject,
        html: html,
      }),
    })

    const result = await res.json()

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
