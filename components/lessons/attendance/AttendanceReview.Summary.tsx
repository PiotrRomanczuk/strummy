import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { StudentAttendance } from './attendance.helpers';

type Props = {
  rows: StudentAttendance[];
  who: (row: StudentAttendance) => string;
};

/** Per-student counts for the month: held, not held, still to confirm. */
export async function AttendanceReviewSummary({ rows, who }: Props) {
  if (rows.length === 0) return null;
  const t = await getTranslations('Calendar');
  return (
    <div className="overflow-x-auto border-t border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-medium">{t('attendanceStudentColumn')}</th>
            <th className="px-4 py-2 text-right font-medium">{t('attendanceHeldColumn')}</th>
            <th className="px-4 py-2 text-right font-medium">{t('attendanceNotHeldColumn')}</th>
            <th className="px-4 py-2 text-right font-medium">{t('attendanceAwaitingColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.studentId}
              data-testid="attendance-summary-row"
              className="border-t border-border"
            >
              <td className="px-4 py-2">
                <Link href={`/dashboard/users/${row.studentId}`} className="hover:underline">
                  {who(row)}
                </Link>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{row.held}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.notHeld}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.awaiting}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
