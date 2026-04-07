import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const email = formData.get('email') as string;
    const token = formData.get('token') as string;
    const name = formData.get('name') as string;

    // 1. SECURITY CHECK (Verify token + 10 min expiry)
    const [record]: any = await pool.execute(
      `SELECT id FROM applications 
       WHERE email = ? AND verification_token = ? AND status = 'pending'
       AND updated_at >= NOW() - INTERVAL 10 MINUTE`,
      [email, token]
    );

    if (record.length === 0) {
      return NextResponse.json({ message: "Security Error: Link expired or invalid." }, { status: 403 });
    }

    const rowId = record[0].id;

    // 2. FILE UPLOAD (Format: fullname_resume.pdf)
    const file = formData.get('resume_path') as File;
    const fileExt = path.extname(file.name);
    const cleanName = name.trim().replace(/\s+/g, '_');
    const fileName = `${Date.now()}_${cleanName}_resume${fileExt}`;
    
    const uploadDir = path.join(process.cwd(), 'public/resumes');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

    // 3. APPLICATION CODE GENERATION (Format: APP/DDMMYY/001)
    const todayStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    }).replace(/\//g, ''); // 270326

    const [lastApp]: any = await pool.execute(
      `SELECT application_code FROM applications 
       WHERE application_code LIKE ? ORDER BY application_code DESC LIMIT 1`,
      [`APP/${todayStr}/%`]
    );

    let nextNum = 1;
    if (lastApp.length > 0) {
      const parts = lastApp[0].application_code.split('/');
      nextNum = parseInt(parts[2]) + 1;
    }
    const appCode = `APP/${todayStr}/${String(nextNum).padStart(3, '0')}`;

    // 4. UPDATE RECORD
    await pool.execute(
      `UPDATE applications SET 
        application_code = ?, name = ?, phone = ?, college = ?, degree = ?, 
        year = ?, cgpa = ?, domain = ?, duration = ?, duration_unit = ?, 
        skills = ?, resume_path = ?, status = 'applied', verification_token = NULL,
        updated_at = NOW()
       WHERE id = ?`,
      [
        appCode, name, formData.get('phone'), formData.get('college'),
        formData.get('degree'), formData.get('last_exam_appeared'),
        formData.get('cgpa'), formData.get('domain'), formData.get('duration'),
        formData.get('duration_unit'), formData.get('skills'),
        `resumes/${fileName}`, rowId
      ]
    );

    return NextResponse.json({ 
      status: "success", 
      message: `Success! Your Application Code is: ${appCode}`,
      appCode: appCode 
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}