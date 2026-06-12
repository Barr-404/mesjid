import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this-in-production'
);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY);

    return NextResponse.json({
      success: true,
      data: {
        userId: payload.userId,
        email: payload.email,
        nama: payload.nama,
        role: payload.role
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Invalid token'
    }, { status: 401 });
  }
}
