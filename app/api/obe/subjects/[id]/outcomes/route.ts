import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSuperAdmin, isHOD } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: subjectId } = await params;

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        department: true,
        courseOutcomes: {
          include: {
            poMappings: {
              include: { po: true },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const allPOs = await prisma.programOutcome.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    return NextResponse.json({
      subject,
      courseOutcomes: subject.courseOutcomes,
      programOutcomes: allPOs,
    });
  } catch (error: any) {
    console.error('Error fetching subject outcomes:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: subjectId } = await params;
    const body = await req.json();
    const { code, description, bloomsLevel, targetThresholdPercent } = body;

    if (!code || !description) {
      return NextResponse.json({ error: 'Code and description required' }, { status: 400 });
    }

    const co = await prisma.courseOutcome.upsert({
      where: {
        subjectId_code: {
          subjectId,
          code,
        },
      },
      create: {
        subjectId,
        code,
        description,
        bloomsLevel: bloomsLevel || 'K2_UNDERSTAND',
        targetThresholdPercent: Number(targetThresholdPercent) || 50.0,
      },
      update: {
        description,
        bloomsLevel: bloomsLevel || 'K2_UNDERSTAND',
        targetThresholdPercent: Number(targetThresholdPercent) || 50.0,
      },
    });

    return NextResponse.json({ success: true, courseOutcome: co });
  } catch (error: any) {
    console.error('Error saving course outcome:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mappings } = body; // Array of { coId, poId, correlationLevel }

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json({ error: 'Mappings array required' }, { status: 400 });
    }

    await prisma.$transaction(
      mappings.map((m: any) =>
        prisma.cO_PO_Mapping.upsert({
          where: {
            coId_poId: {
              coId: m.coId,
              poId: m.poId,
            },
          },
          create: {
            coId: m.coId,
            poId: m.poId,
            correlationLevel: Number(m.correlationLevel) || 0,
          },
          update: {
            correlationLevel: Number(m.correlationLevel) || 0,
          },
        })
      )
    );

    return NextResponse.json({ success: true, updatedCount: mappings.length });
  } catch (error: any) {
    console.error('Error updating CO-PO matrix:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
