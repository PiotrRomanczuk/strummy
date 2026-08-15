'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, GraduationCap, Plus } from 'lucide-react';
import { staggerContainer, listItem } from '@/lib/animations/variants';
import { MobilePageShell } from '@/components/shared/MobilePageShell';
import { FloatingActionButton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { levelLabel } from '@/components/shared/level-label.helpers';
import type { TheoryCourse } from './theory.types';

const LEVEL_STYLES: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  advanced: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface CourseCardProps {
  course: TheoryCourse;
  isStaff: boolean;
}

function CourseCard({ course, isStaff }: CourseCardProps) {
  const t = useTranslations('Theory');

  return (
    <Link
      href={`/dashboard/theory/${course.id}`}
      className="block bg-card rounded-[10px] border border-border p-4 space-y-2
                 active:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground font-medium">
            {levelLabel(course.level, t)}
          </div>
          <h3 className="font-serif text-base leading-tight line-clamp-2">
            {course.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5',
              'text-[10px] font-medium border',
              LEVEL_STYLES[course.level] ?? 'bg-muted text-muted-foreground border-border'
            )}
          >
            {levelLabel(course.level, t)}
          </span>
          {isStaff && (
            course.is_published
              ? <Eye className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {course.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {course.description}
        </p>
      )}

      <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[.14em]">
        <BookOpen className="h-3.5 w-3.5" />
        <span>{t('courseCardChapterCount', { count: course.lesson_count })}</span>
      </div>
    </Link>
  );
}

interface CourseListMobileProps {
  courses: TheoryCourse[];
  isStaff: boolean;
}

export function CourseListMobile({ courses, isStaff }: CourseListMobileProps) {
  const router = useRouter();
  const t = useTranslations('Theory');

  return (
    <MobilePageShell
      title={t('courseListTitle')}
      subtitle={t('courseListCountSubtitle', { count: courses.length })}
      showBack
      fab={
        isStaff ? (
          <FloatingActionButton
            onClick={() => router.push('/dashboard/theory/new')}
            label={t('courseListNewCourseButton')}
            icon={<Plus className="h-6 w-6" />}
          />
        ) : undefined
      }
    >
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <GraduationCap className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-serif text-base italic text-muted-foreground max-w-xs">
            {isStaff ? t('courseListEmptyStaff') : t('courseListEmptyStudent')}
          </p>
          {isStaff && (
            <Link href="/dashboard/theory/new">
              <Button size="sm" className="mt-4">
                {t('courseListNewCourseButton')}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {courses.map((course) => (
            <motion.div key={course.id} variants={listItem}>
              <CourseCard course={course} isStaff={isStaff} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </MobilePageShell>
  );
}
