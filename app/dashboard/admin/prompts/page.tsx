import { getPromptTemplates } from '@/app/actions/admin/prompts';
import { PromptsClient } from './PromptsClient';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'AI Prompts Admin | Strummy',
};

export default async function PromptsPage() {
  const { isAdmin } = await getUserWithRolesSSR();
  
  if (!isAdmin) {
    redirect('/dashboard');
  }

  const prompts = await getPromptTemplates();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">AI Prompt Templates</h1>
        <p className="text-sm text-muted-foreground">
          Manage system prompts for AI generations, chatbots, and feedback.
        </p>
      </header>
      <PromptsClient initialPrompts={prompts} />
    </div>
  );
}
