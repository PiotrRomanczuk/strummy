// Course browsing + reading (mobile/desktop split, lazy desktop variants).
export { CourseList } from './CourseList';
export { ChapterReader } from './ChapterReader';
export { CourseForm } from './CourseForm';
export { CourseListSkeleton } from './CourseList.Skeleton';
export type { TheoryCourse, TheoryLesson, ChapterNav } from './theory.types';

// Lesson authoring + access control — no mobile/desktop split.
// TheoryLessonForm keeps its prefix: components/lessons/form/LessonForm.tsx
// already owns the unprefixed name, so the prefix is load-bearing here.
export { TheoryLessonForm } from './TheoryLessonForm';
export { CourseAccessManager } from './CourseAccessManager';
