import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { AttendanceEngineService } from '@/lib/services/attendance-engine.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId parameter required' }, { status: 400 });
    }

    const sessions = await AttendanceEngineService.getAssignmentSessions(assignmentId);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching attendance sessions:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assignmentId, date, hour, sessionTopic, records } = body;

    if (!assignmentId || !date || hour === undefined || !records) {
      return NextResponse.json({ error: 'Missing required attendance fields' }, { status: 400 });
    }

    const session = await AttendanceEngineService.recordSessionAttendance({
      assignmentId,
      date,
      hour: Number(hour),
      sessionTopic,
      conductedById: user.id,
      records,
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('Error recording session attendance:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
