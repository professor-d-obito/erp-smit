import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSuperAdmin, isHOD, isStaff } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId');
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const skip = (page - 1) * limit;

    // Department Isolation
    let effectiveDeptId = departmentId;
    if ((isHOD(user) || isStaff(user)) && user.departmentId) {
      effectiveDeptId = user.departmentId;
    }

    const studentWhere: any = {
      ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(semester ? { semester: parseInt(semester, 10) } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { rollNumber: { contains: search } },
            ],
          }
        : {}),
    };

    const feeWhere: any = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(category && category !== 'ALL' ? { category } : {}),
      student: studentWhere,
    };

    const [fees, totalCount] = await Promise.all([
      prisma.studentFee.findMany({
        where: feeWhere,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          student: {
            select: {
              id: true,
              rollNumber: true,
              name: true,
              semester: true,
              section: true,
              batch: true,
              department: { select: { id: true, code: true, name: true } },
              course: { select: { id: true, code: true, name: true } },
            },
          },
          feeStructure: { select: { id: true, title: true, category: true } },
          payments: {
            orderBy: { paidDate: 'desc' },
            select: {
              id: true,
              receiptNumber: true,
              amount: true,
              paymentMode: true,
              transactionRef: true,
              paidDate: true,
            },
          },
        },
      }),
      prisma.studentFee.count({ where: feeWhere }),
    ]);

    // Financial KPI Aggregates
    const allMatchingFees = await prisma.studentFee.findMany({
      where: feeWhere,
      select: {
        totalAmount: true,
        discountAmount: true,
        paidAmount: true,
        balance: true,
        status: true,
        dueDate: true,
      },
    });

    const now = new Date();
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let overdueCount = 0;

    for (const item of allMatchingFees) {
      totalInvoiced += item.totalAmount - item.discountAmount;
      totalCollected += item.paidAmount;
      totalPending += item.balance;
      if (item.status !== 'PAID' && item.dueDate && new Date(item.dueDate) < now) {
        overdueCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: fees,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalInvoiced,
        totalCollected,
        totalPending,
        overdueCount,
      },
    });
  } catch (err: any) {
    console.error('StudentFees GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve student fees.' }, { status: 500 });
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
      isBatch,
      studentId,
      feeStructureId,
      batchCourseId,
      batchSemester,
      title,
      category = 'TUITION',
      academicYear = '2026-2027',
      totalAmount,
      discountAmount = 0,
      dueDate,
      remarks,
    } = body;

    // Case 1: Batch generation for an entire class
    if (isBatch && batchCourseId) {
      const students = await prisma.student.findMany({
        where: {
          courseId: batchCourseId,
          ...(batchSemester ? { semester: Number(batchSemester) } : {}),
        },
      });

      if (students.length === 0) {
        return NextResponse.json(
          { error: 'No enrolled students found for the selected course & semester.' },
          { status: 404 }
        );
      }

      const netAmount = Number(totalAmount) - Number(discountAmount);
      const feeRecordsData = students.map((st) => ({
        studentId: st.id,
        feeStructureId: feeStructureId || null,
        title: title || `${st.courseId} Semester ${batchSemester || st.semester} Fees`,
        category,
        academicYear,
        totalAmount: Number(totalAmount),
        discountAmount: Number(discountAmount),
        paidAmount: 0.0,
        balance: netAmount,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING',
        remarks: remarks || null,
      }));

      await prisma.studentFee.createMany({
        data: feeRecordsData,
      });

      await createAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        action: 'BATCH_FEES_GENERATED',
        category: 'FEES',
        details: `Generated ${feeRecordsData.length} student fee invoices for course ${batchCourseId} semester ${batchSemester} (${title}, Amount: ₹${totalAmount}).`,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully generated ${feeRecordsData.length} fee invoices.`,
        count: feeRecordsData.length,
      });
    }

    // Case 2: Individual student fee invoice
    if (!studentId || !totalAmount) {
      return NextResponse.json(
        { error: 'Student ID and Total Amount are required.' },
        { status: 400 }
      );
    }

    const targetStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!targetStudent) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const netBalance = Number(totalAmount) - Number(discountAmount);

    const feeRecord = await prisma.studentFee.create({
      data: {
        studentId: targetStudent.id,
        feeStructureId: feeStructureId || null,
        title: title || 'Academic Fee',
        category,
        academicYear,
        totalAmount: Number(totalAmount),
        discountAmount: Number(discountAmount),
        paidAmount: 0.0,
        balance: netBalance,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: netBalance <= 0 ? 'PAID' : 'PENDING',
        remarks: remarks || null,
      },
      include: {
        student: true,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'STUDENT_FEE_CREATED',
      category: 'FEES',
      details: `Created fee invoice of ₹${totalAmount} for student ${targetStudent.name} (${targetStudent.rollNumber}).`,
    });

    return NextResponse.json({ success: true, data: feeRecord });
  } catch (err: any) {
    console.error('StudentFee POST error:', err);
    return NextResponse.json({ error: 'Failed to create student fee invoice.' }, { status: 500 });
  }
}
