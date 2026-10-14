import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { AttainmentEngineService } from '@/lib/services/attainment-engine.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Run attainment calculations
    const attainmentData = await AttainmentEngineService.calculateCourseAttainment(id);
    const internalMarks = await AttainmentEngineService.computeAnnaUniversityInternals(id);

    return NextResponse.json({
      success: true,
      attainment: attainmentData,
      internalMarks,
    });
  } catch (error: any) {
    console.error('Error calculating attainment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
