'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';

interface ChapterNav {
  id: string;
  title: string;
}

interface TheoryChapterReaderProps {
  courseId: string;
  courseTitle: string;
  lesson: {
    id: string;
    title: string;
    content: string;
    updated_at: string;
  };
  prevChapter: ChapterNav | null;
  nextChapter: ChapterNav | null;
}

export function TheoryChapterReader({
  courseId,
  courseTitle,
  lesson,
  prevChapter,
  nextChapter,
}: TheoryChapterReaderProps) {
  const t = useTranslations('Theory');
  const tNav = useTranslations('Nav');

  return (
    <article className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/dashboard/theory" className="hover:underline">
          {tNav('theory')}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/dashboard/theory/${courseId}`} className="hover:underline">
          {courseTitle}
        </Link>
      </nav>

      {/* Title */}
      <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {/* Explicit locale: a bare toLocaleDateString() follows the runtime's own
            locale, which would cause a server/browser hydration mismatch. */}
        {t('chapterReaderLastUpdated', {
          date: new Date(lesson.updated_at).toLocaleDateString('en-US'),
        })}
      </p>

      {/* Content */}
      <div className="prose dark:prose-invert prose-headings:font-semibold prose-a:text-primary max-w-none">
        <ReactMarkdown>{lesson.content}</ReactMarkdown>
      </div>

      {/* Chapter navigation */}
      <div className="flex justify-between items-center mt-12 pt-6 border-t">
        {prevChapter ? (
          <Link href={`/dashboard/theory/${courseId}/${prevChapter.id}`}>
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="size-4" />
              {prevChapter.title}
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {nextChapter ? (
          <Link href={`/dashboard/theory/${courseId}/${nextChapter.id}`}>
            <Button variant="outline" className="gap-2">
              {nextChapter.title}
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </article>
  );
}
