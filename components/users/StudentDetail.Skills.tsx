'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader } from './student-detail.shared';
import type { StudentSkill, Skill } from '@/app/actions/student-skills';
import { upsertStudentSkill } from '@/app/actions/student-skills';

type Props = {
  studentId: string;
  studentSkills: StudentSkill[];
  availableSkills: Skill[];
  canEdit: boolean;
};

export const StudentDetailSkills = ({ studentId, studentSkills, availableSkills, canEdit }: Props) => {
  const t = useTranslations('Users');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSkillId, setNewSkillId] = useState('');
  const [newSkillStatus, setNewSkillStatus] = useState<'todo' | 'in_progress' | 'mastered'>('in_progress');
  
  const handleUpdate = async (skillId: string, status: string) => {
    setIsUpdating(true);
    setError(null);
    const res = await upsertStudentSkill(studentId, skillId, status);
    if (res.error) setError(res.error);
    setIsUpdating(false);
  };

  return (
    <Card>
      <CardHeader
        title="Skills & Progression"
        eyebrow="TRACKING"
      />
      <div className="p-6 pt-0">
        <p className="text-sm text-muted-foreground mb-4">
          Track the skills this student is working on.
        </p>
        
        {studentSkills.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No skills tracked yet.</div>
        ) : (
          <div className="grid gap-4">
            {studentSkills.map((ss) => (
              <div key={ss.id} className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <div className="font-medium text-sm">{ss.skill.name}</div>
                  <div className="text-xs text-muted-foreground">{ss.skill.category}</div>
                </div>
                <div className="border rounded p-1">
                  {canEdit ? (
                    <select
                      className="bg-transparent text-xs outline-none"
                      disabled={isUpdating}
                      value={ss.status}
                      onChange={(e) => handleUpdate(ss.skill_id, e.target.value)}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="mastered">Mastered</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold px-2">
                      {ss.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canEdit && availableSkills.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Assign New Skill</h4>
            <div className="flex gap-2">
              <select 
                id="new-skill-select"
                className="border rounded p-2 text-sm bg-background flex-1"
                disabled={isUpdating}
                value={newSkillId}
                onChange={(e) => setNewSkillId(e.target.value)}
              >
                <option value="">Select a skill...</option>
                {availableSkills
                  .filter(as => !studentSkills.some(ss => ss.skill_id === as.id))
                  .map(as => (
                    <option key={as.id} value={as.id}>{as.category} - {as.name}</option>
                  ))}
              </select>
              <select
                className="border rounded p-2 text-sm bg-background"
                value={newSkillStatus}
                onChange={(e) => setNewSkillStatus(e.target.value as any)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="mastered">Mastered</option>
              </select>
              <button 
                className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm"
                disabled={isUpdating || !newSkillId}
                onClick={() => {
                  if (newSkillId) {
                    handleUpdate(newSkillId, newSkillStatus);
                    setNewSkillId('');
                  }
                }}
              >
                Assign
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        )}
      </div>
    </Card>
  );
};
