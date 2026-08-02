import { adminClient } from './tests/helpers/seed-ids';
async function run() {
  const { error, data } = await adminClient().from('ai_prompt_templates').insert({ 
    name: 'e2e-test-prompt', 
    description: 'E2E Test Prompt',
    category: 'general',
    prompt_template: 'You are an AI assistant for tests. Hello {{name}}',
    variables: ['name'],
    is_system: false,
    is_active: true
  });
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
