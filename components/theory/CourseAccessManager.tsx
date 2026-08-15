'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { grantCourseAccess, revokeCourseAccess } from '@/app/dashboard/theory/actions';

interface AccessRecord {
  id: string;
  profile_id: string;
  granted_at: string;
  user: { id: string; full_name: string | null; email: string } | null;
}

interface Student {
  id: string;
  full_name: string | null;
  email: string;
}

interface CourseAccessManagerProps {
  courseId: string;
  accessList: AccessRecord[];
  students: Student[];
}

export function CourseAccessManager({
  courseId,
  accessList,
  students,
}: CourseAccessManagerProps) {
  const t = useTranslations('Theory');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGranting, setIsGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const existingUserIds = new Set(accessList.map((a) => a.profile_id));
  const availableStudents = students.filter((s) => !existingUserIds.has(s.id));

  async function handleGrant() {
    if (selectedIds.length === 0) return;
    setIsGranting(true);
    await grantCourseAccess(courseId, selectedIds);
    setSelectedIds([]);
    setIsGranting(false);
  }

  async function handleRevoke(userId: string) {
    setRevokingId(userId);
    await revokeCourseAccess(courseId, userId);
    setRevokingId(null);
  }

  function toggleStudent(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('accessManagerTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current access list */}
        {accessList.length > 0 ? (
          <ul className="space-y-2">
            {accessList.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between p-2 rounded-md border"
              >
                <div>
                  <p className="text-sm font-medium">
                    {record.user?.full_name ?? t('accessManagerUnknownName')}
                  </p>
                  <p className="text-xs text-muted-foreground">{record.user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={revokingId === record.profile_id}
                  onClick={() => handleRevoke(record.profile_id)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('accessManagerEmptyState')}</p>
        )}

        {/* Grant access */}
        {availableStudents.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">{t('accessManagerGrantToLabel')}</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="rounded"
                  />
                  <span>{student.full_name ?? student.email}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              disabled={selectedIds.length === 0 || isGranting}
              onClick={handleGrant}
            >
              {isGranting
                ? t('accessManagerGrantingButton')
                : t('accessManagerGrantButton', { count: selectedIds.length })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
