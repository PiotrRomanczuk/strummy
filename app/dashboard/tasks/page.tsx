import { getTasks } from '@/app/actions/tasks';
import { TaskBoard } from './TaskBoard';

export const metadata = {
  title: 'Tasks | Strummy',
};

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal to-dos, studio tasks, and practice goals.
        </p>
      </header>
      <TaskBoard initialTasks={tasks} />
    </div>
  );
}
