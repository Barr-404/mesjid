import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, nama } = await request.json();

    if (!email || !password || !nama) {
      return NextResponse.json({
        success: false,
        error: 'Email, password, dan nama harus diisi'
      }, { status: 400 });
    }

    // Cek apakah email sudah terdaftar
    const checkUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (checkUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Email sudah terdaftar'
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user baru
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, username as nama, role, created_at`,
      [nama, email, hashedPassword]
    );

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Silakan login.',
      data: result.rows[0]
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error registering user:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
