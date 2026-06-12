import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email dan password harus diisi'
      }, { status: 400 });
    }

    // Cari user berdasarkan email
    const result = await pool.query(
      'SELECT id, email, password_hash, username as nama, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Email atau password salah'
      }, { status: 401 });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Email atau password salah'
      }, { status: 401 });
    }

    // Create JWT token
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET_KEY);

    // Set cookie with enhanced configuration
    const cookieStore = await cookies();
    
    // Debug logging for production
    console.log('Setting auth cookie for NODE_ENV:', process.env.NODE_ENV);
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    };
    
    cookieStore.set('auth_token', token, cookieOptions);
    
    console.log('Auth cookie set with options:', {
      ...cookieOptions,
      tokenLength: token.length
    });

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      data: {
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('Error logging in:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
