import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, setSessionCookie, checkRateLimit, clearRateLimit } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body; // identifier can be email or employeeId

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Please enter your Email or Employee ID and Password.' },
        { status: 400 }
      );
    }

    const cleanIdentifier = String(identifier).trim();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // Rate Limiting check
    const rateCheck = checkRateLimit(cleanIdentifier.toLowerCase());
    if (!rateCheck.allowed) {
      await createAuditLog({
        action: 'LOGIN_RATE_LIMITED',
        category: 'SECURITY',
        details: `Too many failed login attempts for user identifier: ${cleanIdentifier}`,
        ipAddress: clientIp,
      });

      return NextResponse.json(
        {
          error: `Too many failed attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Find user by Email or Employee ID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanIdentifier } },
          { employeeId: { equals: cleanIdentifier } },
        ],
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your Email/Employee ID and Password.' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      await createAuditLog({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: 'LOGIN_BLOCKED_INACTIVE',
        category: 'SECURITY',
        details: `Account status is ${user.status}. Login attempt blocked.`,
        ipAddress: clientIp,
      });

      return NextResponse.json(
        { error: `Account is ${user.status.toLowerCase()}. Please contact the SMIT ERP Administrator.` },
        { status: 403 }
      );
    }

    // Compare Password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please check your Email/Employee ID and Password.' },
        { status: 401 }
      );
    }

    // Clear rate limit on successful authentication
    clearRateLimit(cleanIdentifier.toLowerCase());

    // Set Cookie Session
    await setSessionCookie(user.id);

    // Audit Log
    await createAuditLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'LOGIN_SUCCESS',
      category: 'SECURITY',
      details: `User logged into SMIT ERP system (${user.role.label}).`,
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employeeId,
        roleName: user.role.name,
        roleLabel: user.role.label,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err: any) {
    console.error('Login API error:', err);

    // Diagnostic check for unconfigured or uninitialized database (e.g. serverless host without DATABASE_URL)
    const isDbError =
      err?.code?.startsWith?.('P') ||
      err?.name === 'PrismaClientInitializationError' ||
      err?.name === 'PrismaClientKnownRequestError' ||
      err?.message?.includes?.('DATABASE_URL') ||
      err?.message?.includes?.('database') ||
      err?.message?.includes?.('does not exist');

    if (isDbError) {
      return NextResponse.json(
        {
          error:
            'Database error: The database is unreachable or uninitialized. If hosting on Netlify/Vercel, please configure DATABASE_URL in your hosting environment variables.',
          details: process.env.NODE_ENV !== 'production' ? err?.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected authentication error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
