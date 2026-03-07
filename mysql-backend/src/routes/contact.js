const express = require('express');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const audienceLabels = {
  individual: 'Individual',
  university: 'University/Institution',
  government: 'Government Department',
};

// GET /contact — list all contact requests (admin)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM contact_requests ORDER BY created_at DESC'
    );
    return res.json({ data: rows, error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

// POST /contact — submit a contact request + send emails
router.post('/', async (req, res) => {
  try {
    const { audience, full_name, email, phone_number, organization, requirement, consent_to_contact } = req.body;

    if (!audience || !email || !requirement) {
      return res.status(400).json({ error: 'Missing required fields: audience, email, requirement' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO contact_requests (id, audience, full_name, email, phone_number, organization, requirement, consent_to_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, audience, full_name || null, email, phone_number || null, organization || null, requirement, consent_to_contact !== false ? 1 : 0]
    );

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    const audienceLabel = audienceLabels[audience] || audience;
    const userName = full_name || 'there';

    if (process.env.SMTP_USER && adminEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });

        // User confirmation email
        await transporter.sendMail({
          from: `"NTS Language Courses" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'We received your request - NTS Language Courses',
          html: `
            <body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Thank You for Reaching Out!</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p>Hi ${userName},</p>
                <p>We've received your request. You can expect to hear from us within <strong>1-2 working days</strong>.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1e40af;">Your Request Summary</h3>
                  <p><strong>Category:</strong> ${audienceLabel}</p>
                  ${organization ? `<p><strong>Organization:</strong> ${organization}</p>` : ''}
                  <p><strong>Requirement:</strong></p>
                  <p style="color: #64748b;">${requirement}</p>
                </div>
                <p>Best regards,<br><strong>NTS Language Courses Team</strong></p>
              </div>
            </body>
          `,
        });

        // Admin notification email
        await transporter.sendMail({
          from: `"NTS Contact System" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `New Contact Request: ${audienceLabel} - ${full_name || email}`,
          html: `
            <body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">🔔 New Contact Request</h1>
              </div>
              <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <table style="width:100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; font-weight: bold; width: 120px;">Category:</td>
                      <td><span style="background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:20px;">${audienceLabel}</span></td></tr>
                  <tr><td style="padding:8px 0;font-weight:bold;">Name:</td><td>${full_name || 'Not provided'}</td></tr>
                  <tr><td style="padding:8px 0;font-weight:bold;">Email:</td><td><a href="mailto:${email}" style="color:#3b82f6;">${email}</a></td></tr>
                  <tr><td style="padding:8px 0;font-weight:bold;">Phone:</td><td>${phone_number || 'Not provided'}</td></tr>
                  <tr><td style="padding:8px 0;font-weight:bold;">Organization:</td><td>${organization || 'Not provided'}</td></tr>
                </table>
                <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #f97316;margin-top:20px;">
                    <h3 style="margin-top:0;color:#1e40af;">Requirement</h3>
                  <p style="white-space:pre-wrap;">${requirement}</p>
                </div>
                <p style="text-align:center;margin-top:20px;">
                  <a href="${process.env.SITE_URL || 'http://localhost:5173'}/admin" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">View in Admin Panel</a>
                </p>
              </div>
            </body>
          `,
        });
      } catch (mailErr) {
        console.error('Email send error (non-fatal):', mailErr.message);
      }
    }

    const [rows] = await pool.query('SELECT * FROM contact_requests WHERE id = ?', [id]);
    return res.status(201).json({ data: rows[0], error: null });
  } catch (err) {
    console.error('Contact request error:', err);
    return res.status(500).json({ data: null, error: err.message });
  }
});

// PUT /contact/:id — update status (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE contact_requests SET status = ? WHERE id = ?', [status, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM contact_requests WHERE id = ?', [req.params.id]);
    return res.json({ data: rows[0], error: null });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message });
  }
});

module.exports = router;
