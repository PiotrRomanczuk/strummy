'use client';

import { useState } from 'react';
import type { Database } from '@/types/database.types';
import type { TaskRow } from '@/app/actions/tasks';
import { updateTask, createTask, deleteTask } from '@/app/actions/tasks';

type TaskStatus = Database['public']['Enums']['task_status'];
type TaskPriority = Database['public']['Enums']['task_priority'];

type Props = {
  initialTasks: TaskRow[];
};

const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED'] as const;

export const TaskBoard = ({ initialTasks }: Props) => {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    await updateTask(id, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTask(id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const title = newTaskTitle.trim();
    setNewTaskTitle('');
    setIsAdding(false);

    // We don't have the ID optimistically, so we just wait for the server action
    // and rely on revalidatePath to refresh the page, but since we use local state,
    // we need to either fetch again or just let Server Components re-render.
    // For simplicity, we just trigger a page reload since revalidatePath is called in action.
    await createTask({
      title,
      status: 'OPEN' satisfies TaskStatus,
      priority: 'MEDIUM' satisfies TaskPriority,
      description: null,
      due_date: null,
    });
    window.location.reload();
  };

  return (
    <div>
      <div className="mb-6">
        {isAdding ? (
          <form onSubmit={handleCreate} className="flex gap-2 max-w-md">
            <input
              type="text"
              autoFocus
              className="border p-2 rounded flex-grow text-sm"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 rounded text-sm font-medium"
            >
              Add
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 text-sm">
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium"
          >
            + New Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATUSES.map((status) => (
          <div key={status} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
            <h3 className="font-semibold mb-4 capitalize flex justify-between items-center text-sm">
              {status.replace('_', ' ')}
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs">
                {tasks.filter((t) => t.status === status).length}
              </span>
            </h3>

            <div className="flex flex-col gap-3">
              {tasks
                .filter((t) => t.status === status)
                .map((task) => (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-slate-950 p-3 rounded shadow-sm border text-sm group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{task.title}</span>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>

                    <select
                      className="w-full text-xs border rounded p-1 bg-slate-50 dark:bg-slate-900"
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                ))}

              {tasks.filter((t) => t.status === status).length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4 border-2 border-dashed rounded">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
