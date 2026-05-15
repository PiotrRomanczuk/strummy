import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check teacher role from profiles table boolean flags
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_teacher')
      .eq('id', user.id)
      .single();

    if (!profile?.is_teacher) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get student IDs from active (non-deleted) lessons where this user is the teacher
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('student_id')
      .eq('teacher_id', user.id)
      .is('deleted_at', null);

    if (lessonError) {
      return NextResponse.json({ error: lessonError.message }, { status: 500 });
    }

    // Extract unique student IDs
    const studentIds = Array.from(
      new Set((lessonData || []).map((l) => l.student_id))
    );

    // If teacher has no students via lessons, return empty list
    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Fetch only the profiles for students linked to this teacher via lessons
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)
      .order('full_name');

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    const flatStudents = (students || []).map((s) => ({
      id: s.id,
      full_name: s.full_name,
      is_student: true,
    }));

    return NextResponse.json({ students: flatStudents });
  } catch (error) {
    logger.error('Error fetching teacher students:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
