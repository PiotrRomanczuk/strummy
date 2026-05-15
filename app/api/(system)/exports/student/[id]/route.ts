import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { canViewUser } from '@/lib/services/user.service';
import { getStudentIdsForTeacher } from '@/lib/repositories/user.repository';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const format = searchParams.get('format') || 'pdf';

    // Auth check - Get user with role information
    const { user, isAdmin, isTeacher, isStudent } = await getUserWithRolesSSR();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization check - Verify user can view this student's data
    // FIXES STRUMMY-280: Prevents unauthorized access to student exports
    let allowedStudentIds: string[] | undefined;
    if (isTeacher && !isAdmin) {
      allowedStudentIds = await getStudentIdsForTeacher(supabase, user.id);
    }

    const authCheck = canViewUser(
      user.id,
      { isAdmin, isTeacher, isStudent },
      id,
      allowedStudentIds
    );

    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason || 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch student profile
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch lessons with songs
    const { data: lessons } = await supabase
      .from('lessons')
      .select(
        `
        *,
        lesson_songs(
          song_id,
          status,
          songs(id, title, author, level, key)
        )
      `
      )
      .eq('student_id', id)
      .order('date', { ascending: false });

    // Fetch student's songs with status from user_song_status
    const { data: userSongs } = await supabase
      .from('user_song_status')
      .select(
        `
        status,
        songs(id, title, author, level, key, chords)
      `
      )
      .eq('user_id', id);

    // Transform songs data
    const songs =
      userSongs?.map((us) => ({
        ...(us.songs as object),
        status: us.status,
      })) || [];

    // Transform lessons data
    const transformedLessons =
      lessons?.map((lesson) => ({
        ...lesson,
        songs:
          lesson.lesson_songs?.map(
            (ls: { songs: Record<string, unknown>; status: string }) => ({
              ...ls.songs,
              status: ls.status,
            })
          ) || [],
      })) || [];

    const exportData = {
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        created_at: student.created_at,
      },
      lessons: transformedLessons,
      songs,
    };

    if (format === 'json') {
      return NextResponse.json(exportData);
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(exportData);
      const studentName =
        `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'student';
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="progress-${studentName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`,
        },
      });
    }

    if (format === 'xlsx') {
      const excelBuffer = await generateExcel(exportData);
      const studentName =
        `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'student';
      return new NextResponse(new Uint8Array(excelBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="progress-${studentName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    logger.error('Error in student export API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface ExportData {
  student: {
    firstName?: string;
    lastName?: string;
    email?: string;
    created_at?: string;
  };
  lessons: Array<{
    id: string;
    date: string;
    status?: string;
    notes?: string;
    songs: Array<{ title?: string; author?: string }>;
  }>;
  songs: Array<{
    id?: string;
    title?: string;
    author?: string;
    level?: string;
    status?: string;
  }>;
}

async function generatePDF(data: ExportData): Promise<Buffer> {
  // Dynamic import to avoid build issues if not installed
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const { student, lessons, songs } = data;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 95);
  doc.text('Student Progress Report', 20, 20);

  // Student info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const name = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown';
  doc.text(`Student: ${name}`, 20, 35);
  doc.text(`Email: ${student.email || 'N/A'}`, 20, 42);
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 49);
  if (student.created_at) {
    doc.text(`Member Since: ${new Date(student.created_at).toLocaleDateString()}`, 20, 56);
  }

  // Summary stats
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text('Summary', 20, 70);

  const completedLessons = lessons.filter((l) => l.status === 'COMPLETED').length;
  const songCounts = {
    to_learn: songs.filter((s) => s.status === 'to_learn').length,
    started: songs.filter((s) => s.status === 'started').length,
    remembered: songs.filter((s) => s.status === 'remembered').length,
    mastered: songs.filter((s) => s.status === 'mastered').length,
  };

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Lessons: ${lessons.length} (${completedLessons} completed)`, 20, 80);
  doc.text(
    `Songs: ${songs.length} total - ${songCounts.mastered} mastered, ${songCounts.remembered} remembered, ${songCounts.started} started, ${songCounts.to_learn} to learn`,
    20,
    87
  );

  // Songs table
  if (songs.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text('Song Repertoire', 20, 100);

    autoTable(doc, {
      startY: 105,
      head: [['Song', 'Artist', 'Level', 'Status']],
      body: songs.map((song) => [
        song.title || 'Unknown',
        song.author || 'Unknown',
        song.level || 'N/A',
        (song.status || 'to_learn').replace('_', ' '),
      ]),
      headStyles: { fillColor: [68, 114, 196] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 9 },
    });
  }

  // Recent lessons table
  if (lessons.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 105;
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text('Recent Lessons', 20, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Status', 'Songs Covered', 'Notes']],
      body: lessons.slice(0, 10).map((lesson) => [
        lesson.date ? new Date(lesson.date).toLocaleDateString() : 'N/A',
        lesson.status || 'N/A',
        lesson.songs?.map((s) => s.title).join(', ') || 'None',
        (lesson.notes || '').substring(0, 40) + ((lesson.notes?.length || 0) > 40 ? '...' : ''),
      ]),
      headStyles: { fillColor: [40, 167, 69] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { cellWidth: 50 },
      },
    });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

async function generateExcel(data: ExportData): Promise<Buffer> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const { student, lessons, songs } = data;

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  const name = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown';

  summarySheet.addRow(['Student Progress Report']);
  summarySheet.addRow([]);
  summarySheet.addRow(['Student:', name]);
  summarySheet.addRow(['Email:', student.email || 'N/A']);
  summarySheet.addRow(['Report Date:', new Date().toLocaleDateString()]);
  summarySheet.addRow([]);
  summarySheet.addRow(['Summary Statistics']);
  summarySheet.addRow(['Total Lessons:', lessons.length]);
  summarySheet.addRow([
    'Completed Lessons:',
    lessons.filter((l) => l.status === 'COMPLETED').length,
  ]);
  summarySheet.addRow(['Total Songs:', songs.length]);
  summarySheet.addRow(['Songs Mastered:', songs.filter((s) => s.status === 'mastered').length]);

  summarySheet.getRow(1).font = { bold: true, size: 16 };
  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 30;

  // Songs sheet
  const songsSheet = workbook.addWorksheet('Songs');
  songsSheet.columns = [
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Artist', key: 'author', width: 20 },
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  songs.forEach((song) => {
    songsSheet.addRow({
      title: song.title || 'Unknown',
      author: song.author || 'Unknown',
      level: song.level || 'N/A',
      status: (song.status || 'to_learn').replace('_', ' '),
    });
  });

  // Style header
  songsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  songsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };

  // Lessons sheet
  const lessonsSheet = workbook.addWorksheet('Lessons');
  lessonsSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Songs Covered', key: 'songs', width: 40 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];

  lessons.forEach((lesson) => {
    lessonsSheet.addRow({
      date: lesson.date ? new Date(lesson.date).toLocaleDateString() : 'N/A',
      status: lesson.status || 'N/A',
      songs: lesson.songs?.map((s) => s.title).join(', ') || '',
      notes: lesson.notes || '',
    });
  });

  lessonsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  lessonsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF28A745' },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
