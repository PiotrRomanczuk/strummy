'use client';

import { useState } from 'react';
import type { PromptTemplateRow } from '@/app/actions/admin/prompts';
import { updatePromptTemplate, createPromptTemplate } from '@/app/actions/admin/prompts';

type Props = {
  initialPrompts: PromptTemplateRow[];
};

export const PromptsClient = ({ initialPrompts }: Props) => {
  const [prompts, setPrompts] = useState<PromptTemplateRow[]>(initialPrompts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (prompt: PromptTemplateRow) => {
    setEditingId(prompt.id);
    setEditValue(prompt.prompt_template);
  };

  const handleSave = async (id: string) => {
    setIsSaving(true);
    const res = await updatePromptTemplate(id, { prompt_template: editValue });
    if (!res.error) {
      setPrompts(prev => prev.map(p => p.id === id ? { ...p, prompt_template: editValue } : p));
      setEditingId(null);
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="grid gap-6">
      {prompts.map(prompt => (
        <div key={prompt.id} className="bg-white dark:bg-slate-950 rounded-lg border p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {prompt.name}
                {prompt.is_system && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">System</span>
                )}
                {!prompt.is_active && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
            </div>
            {editingId !== prompt.id && (
              <button 
                onClick={() => handleEdit(prompt)}
                className="text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {editingId === prompt.id ? (
            <div className="mt-4">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full h-48 p-3 border rounded text-sm font-mono bg-slate-50 dark:bg-slate-900"
                disabled={isSaving}
              />
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => handleSave(prompt.id)}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium"
                >
                  Save Changes
                </button>
                <button 
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 rounded text-sm border hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded bg-slate-50 dark:bg-slate-900 border overflow-x-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">{prompt.prompt_template}</pre>
            </div>
          )}

          {prompt.variables && Object.keys(prompt.variables as object).length > 0 && (
            <div className="mt-4 text-xs">
              <strong className="text-slate-500">Variables: </strong>
              <span className="text-slate-600 font-mono">
                {Object.keys(prompt.variables as object).join(', ')}
              </span>
            </div>
          )}
        </div>
      ))}

      {prompts.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
          No prompt templates found.
        </div>
      )}
    </div>
  );
};
