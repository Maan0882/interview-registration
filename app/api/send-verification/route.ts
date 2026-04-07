import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // 1. AUTOMATIC CLEANUP: Delete pending records older than 10 minutes
    await pool.execute(
      "DELETE FROM applications WHERE status = 'pending' AND updated_at < NOW() - INTERVAL 10 MINUTE"
    );

    // 2. CHECK IF ALREADY APPLIED
    const [existing]: any = await pool.execute(
      "SELECT application_code FROM applications WHERE email = ? AND status = 'applied' LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json({ 
        status: "error", 
        message: `An application with this email has already been submitted. Code: ${existing[0].application_code}` 
      }, { status: 400 });
    }

    // 3. CREATE PENDING RECORD
    const token = crypto.randomBytes(16).toString('hex');
    await pool.execute(
      `INSERT INTO applications (email, verification_token, status, created_at, updated_at) 
       VALUES (?, ?, 'pending', NOW(), NOW())`,
      [email, token]
    );

    // 4. SEND EMAIL
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/?token=${token}&email=${encodeURIComponent(email)}`;

    await transporter.sendMail({
      from: `"TechStrota Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - TechStrota Internship Application',
      html: `<h3>Verify Email</h3><p>Click below to verify and open the form (valid for 10 mins):</p>
             <p><a href='${verifyUrl}' style='background:#f4a340; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;'>Verify Email</a></p>`
    });

    return NextResponse.json({ status: "success", message: "Verification link sent!" });

  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}