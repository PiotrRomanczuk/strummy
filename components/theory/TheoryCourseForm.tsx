'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTheoryCourse, updateTheoryCourse } from '@/app/dashboard/theory/actions';

interface TheoryCourseFormProps {
  mode: 'create' | 'edit';
  courseId?: string;
  defaultValues?: {
    title: string;
    description: string;
    cover_image_url: string;
    level: string;
    is_published: boolean;
  };
}

export function TheoryCourseForm({ mode, courseId, defaultValues }: TheoryCourseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [coverUrl, setCoverUrl] = useState(defaultValues?.cover_image_url ?? '');
  const [level, setLevel] = useState(defaultValues?.level ?? 'beginner');
  const [isPublished, setIsPublished] = useState(defaultValues?.is_published ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const input = {
      title,
      description: description || undefined,
      cover_image_url: coverUrl || undefined,
      level,
      is_published: isPublished,
    };

    const result =
      mode === 'create'
        ? await createTheoryCourse(input)
        : await updateTheoryCourse(courseId!, input);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? 'Something went wrong');
      return;
    }

    if (mode === 'create' && 'courseId' in result) {
      router.push(`/dashboard/theory/${result.courseId}`);
    } else {
      router.push(`/dashboard/theory/${courseId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Music Theory Fundamentals"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students will learn in this course..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_url">Cover Image URL</Label>
        <Input
          id="cover_url"
          type="url"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="level">Level</Label>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger id="level">
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
        <Label htmlFor="published">Publish course</Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Course' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
