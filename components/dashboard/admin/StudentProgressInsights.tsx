'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Brain, Loader2, User, Calendar } from 'lucide-react';
import { analyzeStudentProgressStream } from '@/app/actions/ai';
import { logger } from '@/lib/logger';

const TIME_PERIOD_LABEL_KEYS = {
  last_30_days: 'progressPeriodLast30',
  last_90_days: 'progressPeriodLast90',
  all_time: 'progressPeriodAll',
} as const;

type TimePeriod = keyof typeof TIME_PERIOD_LABEL_KEYS;

// Sent to the model as-is: the prompt stays English whatever the UI language.
const TIME_PERIOD_PROMPTS: Record<TimePeriod, string> = {
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
  all_time: 'All time',
};

interface Student {
  id: string;
  full_name: string | null;
  email: string;
}

interface Props {
  students: Student[];
}

export function StudentProgressInsights({ students }: Props) {
  const t = useTranslations('AI');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('last_30_days');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>('');

  const handleAnalyze = async () => {
    if (!selectedStudent) return;

    setLoading(true);
    setInsights(''); // Clear previous insights

    try {
      // Streaming server action returns a Promise resolving to the async
      // iterable, so it must be awaited before iterating.
      const streamGenerator = await analyzeStudentProgressStream({
        studentId: selectedStudent,
        timePeriod: TIME_PERIOD_PROMPTS[timePeriod],
      });

      for await (const chunk of streamGenerator) {
        setInsights(String(chunk));
      }
    } catch (error) {
      logger.error('Error analyzing student progress:', error);
      setInsights(t('progressError'));
    } finally {
      setLoading(false);
    }
  };

  const selectedStudentData = students.find((s) => s.id === selectedStudent);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          {t('progressTitle')}
        </CardTitle>
        <CardDescription>{t('progressDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('fieldStudent')}</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder={t('fieldStudentPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {student.full_name || student.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('progressPeriodLabel')}</label>
            <Select
              value={timePeriod}
              onValueChange={(value) => setTimePeriod(value as TimePeriod)}
            >
              <SelectTrigger>
                {/* Explicit children, not auto-resolution: Radix derives the
                    trigger label from the matching SelectItem, which only exists
                    once SelectContent has mounted — so a server-rendered select
                    with a value painted as an empty stub until first click. */}
                <SelectValue>{t(TIME_PERIOD_LABEL_KEYS[timePeriod])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIME_PERIOD_LABEL_KEYS) as TimePeriod[]).map((period) => (
                  <SelectItem
                    key={period}
                    value={period}
                    textValue={t(TIME_PERIOD_LABEL_KEYS[period])}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {t(TIME_PERIOD_LABEL_KEYS[period])}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleAnalyze} disabled={loading || !selectedStudent} className="w-full">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="w-4 h-4 mr-2" />
          )}
          {t('progressAnalyze')}
        </Button>

        {selectedStudentData && (
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">
                {selectedStudentData.full_name || selectedStudentData.email}
              </span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{t(TIME_PERIOD_LABEL_KEYS[timePeriod])}</Badge>
            </div>
          </div>
        )}

        {insights && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('progressResultLabel')}</label>
            <div className="p-4 bg-muted rounded-lg border">
              <div className="whitespace-pre-wrap text-sm">{insights}</div>
            </div>
          </div>
        )}

        {!selectedStudent && (
          <p className="text-sm text-muted-foreground text-center">{t('progressSelectHint')}</p>
        )}
      </CardContent>
    </Card>
  );
}
