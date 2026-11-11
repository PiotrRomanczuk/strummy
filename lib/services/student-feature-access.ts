import { isStudentFeature, type StudentFeature } from '@/lib/config/student-features';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const log = createLogger('student-feature-access');

/** On failure the student simply sees fewer features: hidden is the safe side. */
export async function getStudentFeatures(studentId: string): Promise<StudentFeature[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_feature_access')
    .select('feature_key')
    .eq('student_id', studentId);

  if (error) {
    log.error('Could not load student features', { code: error.code });
    return [];
  }
  return data.map((row) => row.feature_key).filter(isStudentFeature);
}
