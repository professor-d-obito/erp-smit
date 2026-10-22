import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const payments = await prisma.feePayment.findMany({
      take: limit,
      orderBy: { paidDate: 'desc' },
      include: {
        studentFee: {
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true,
                name: true,
                department: { select: { code: true, name: true } },
                course: { select: { code: true, name: true } },
              },
            },
          },
        },
        collectedByUser: {
          select: { id: true, name: true, employeeId: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (err: any) {
    console.error('Payments GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve fee payments.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentFeeId,
      amount,
      paymentMode = 'CASH',
      transactionRef,
      remarks,
    } = body;

    if (!studentFeeId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Valid Student Fee ID and Payment Amount are required.' },
        { status: 400 }
      );
    }

    const payAmount = Number(amount);

    // Fetch existing fee record
    const feeRecord = await prisma.studentFee.findUnique({
      where: { id: studentFeeId },
      include: {
        student: {
          include: {
            department: true,
            course: true,
          },
        },
      },
    });

    if (!feeRecord) {
      return NextResponse.json({ error: 'Fee invoice record not found.' }, { status: 404 });
    }

    if (feeRecord.status === 'PAID') {
      return NextResponse.json(
        { error: 'This fee invoice has already been fully paid.' },
        { status: 400 }
      );
    }

    // Generate unique sequential receipt number: REC-YYYY-RANDOM/COUNT
    const count = await prisma.feePayment.count();
    const year = new Date().getFullYear();
    const receiptNumber = `REC-${year}-${String(count + 1).padStart(5, '0')}`;

    // Record the payment
    const payment = await prisma.feePayment.create({
      data: {
        studentFeeId: feeRecord.id,
        receiptNumber,
        amount: payAmount,
        paymentMode,
        transactionRef: transactionRef || null,
        paidDate: new Date(),
        collectedByUserId: currentUser.id,
        remarks: remarks || null,
      },
    });

    // Update StudentFee record: new paidAmount, new balance, new status
    const newPaidAmount = feeRecord.paidAmount + payAmount;
    const newBalance = Math.max(0, feeRecord.balance - payAmount);
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    const updatedFee = await prisma.studentFee.update({
      where: { id: feeRecord.id },
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance,
        status: newStatus,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'FEE_PAYMENT_COLLECTED',
      category: 'FINANCE',
      details: `Collected ₹${payAmount} via ${paymentMode} from student ${feeRecord.student.name} (${feeRecord.student.rollNumber}). Receipt: ${receiptNumber}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Payment of ₹${payAmount} recorded successfully.`,
      payment,
      updatedFee,
      receiptDetails: {
        receiptNumber,
        paidDate: payment.paidDate,
        amount: payAmount,
        paymentMode,
        transactionRef,
        studentName: feeRecord.student.name,
        rollNumber: feeRecord.student.rollNumber,
        department: feeRecord.student.department.name,
        course: feeRecord.student.course.name,
        feeTitle: feeRecord.title,
        remainingBalance: newBalance,
        collectedBy: currentUser.name,
      },
    });
  } catch (err: any) {
    console.error('FeePayment POST error:', err);
    return NextResponse.json(
      { error: 'Failed to record fee payment transaction.' },
      { status: 500 }
    );
  }
}
