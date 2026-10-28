#!/usr/bin/env tsx

/**
 * Consolidated AI Testing Script
 * Tests AI providers, LLM connectivity, and AI-powered features
 *
 * Usage:
 *   npx tsx scripts/testing/test-ai.ts              # Run quick check
 *   npx tsx scripts/testing/test-ai.ts check        # Quick Ollama check
 *   npx tsx scripts/testing/test-ai.ts provider     # Test provider abstraction
 *   npx tsx scripts/testing/test-ai.ts integration  # Full integration test
 *   npx tsx scripts/testing/test-ai.ts mapping      # Test AI model mapping
 *   npx tsx scripts/testing/test-ai.ts all          # Run all tests
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const COMMANDS = ['check', 'provider', 'integration', 'mapping', 'all'] as const;
type Command = (typeof COMMANDS)[number];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, COLORS.green);
}

function error(message: string) {
  log(`❌ ${message}`, COLORS.red);
}

function section(title: string) {
  log(`\n${'='.repeat(50)}`, COLORS.cyan);
  log(`  ${title}`, COLORS.bright + COLORS.cyan);
  log(`${'='.repeat(50)}`, COLORS.cyan);
}

async function quickCheck(): Promise<boolean> {
  section('QUICK OLLAMA CHECK');

  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      error('Ollama is not responding');
      return false;
    }

    const data = await response.json();
    const models = data.models || [];

    success('Ollama is running');
    console.log(`📦 Models installed: ${models.length}`);

    if (models.length === 0) {
      console.log('\n⚠️  No models found. Install one:');
      console.log('   ollama pull llama3.2');
      return false;
    }

    models.forEach((model: { name: string; size: number }, index: number) => {
      const size = (model.size / 1024 / 1024 / 1024).toFixed(1);
      console.log(`   ${index + 1}. ${model.name} (${size} GB)`);
    });

    success('Local LLM is ready!');
    return true;
  } catch {
    error('Cannot connect to Ollama');
    console.log('\nMake sure Ollama is running:');
    console.log('   ollama serve\n');
    return false;
  }
}

async function testProvider(): Promise<boolean> {
  section('AI PROVIDER TEST');

  try {
    const { OllamaProvider } = await import('../../lib/ai/providers/ollama');
    const { OpenRouterProvider } = await import('../../lib/ai/providers/openrouter');

    // Test Ollama provider
    console.log('\n📡 Testing Ollama provider...');
    const ollamaProvider = new OllamaProvider();
    const ollamaAvailable = await ollamaProvider.isAvailable();
    console.log(`   Ollama: ${ollamaAvailable ? '✅ Available' : '❌ Not available'}`);

    if (ollamaAvailable) {
      const models = await ollamaProvider.listModels();
      console.log(`   Models: ${models.length} available`);
    }

    // Test OpenRouter provider
    console.log('\n📡 Testing OpenRouter provider...');
    const openRouterProvider = new OpenRouterProvider();
    const openRouterAvailable = await openRouterProvider.isAvailable();
    console.log(`   OpenRouter: ${openRouterAvailable ? '✅ Available' : '❌ Not available'}`);

    return ollamaAvailable || openRouterAvailable;
  } catch (err) {
    error(`Provider test failed: ${err}`);
    return false;
  }
}

async function testIntegration(): Promise<boolean> {
  section('AI INTEGRATION TEST');

  console.log('\nEnvironment:');
  console.log(`  AI_PROVIDER: ${process.env.AI_PROVIDER || 'not set (defaults to auto)'}`);
  console.log(`  OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ set' : '❌ not set'}`);
  console.log(
    `  OLLAMA_BASE_URL: ${process.env.OLLAMA_BASE_URL || 'not set (defaults to localhost:11434)'}`
  );
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ set' : '❌ not set'}`);

  try {
    const { getAIProvider } = await import('../../lib/ai/provider-factory');
    const { isAIError } = await import('../../lib/ai/types');

    console.log('\n📡 Getting AI provider...');
    const provider = await getAIProvider();
    success(`Provider selected: ${provider.name}`);

    console.log('\n🔍 Checking provider availability...');
    const available = await provider.isAvailable();

    if (!available) {
      error(`${provider.name} is not available`);
      return false;
    }

    success(`${provider.name} is available`);

    console.log('\n📋 Fetching available models...');
    const models = await provider.listModels();
    console.log(`✅ Found ${models.length} models`);

    // Test a simple prompt
    console.log('\n🧪 Testing simple prompt...');
    const result = await provider.generate({
      prompt: 'Say "Hello, AI is working!" and nothing else.',
      options: { temperature: 0.1 },
    });

    if (isAIError(result)) {
      error(`Generation failed: ${result.error}`);
      return false;
    }

    success('AI generation working!');
    console.log(`   Response: ${result.content.slice(0, 100)}...`);

    return true;
  } catch (err) {
    error(`Integration test failed: ${err}`);
    return false;
  }
}

async function testMapping(): Promise<boolean> {
  section('AI MODEL MAPPING TEST');

  try {
    const { generateAIResponse } = await import('../../app/actions/ai');

    console.log('\nTesting AI model mapping through server action...');

    const response = await generateAIResponse(
      'Clean and normalize this song data: title="wonderwal", artist="oasiss". Respond with just the corrected title and artist.'
    );

    if (response.error) {
      error(`Mapping test failed: ${response.error}`);
      return false;
    }

    success('AI mapping working!');
    console.log(`   Response: ${response.content?.slice(0, 200)}...`);

    return true;
  } catch (err) {
    error(`Mapping test failed: ${err}`);
    return false;
  }
}

async function main() {
  console.log('\n🤖 AI TESTING UTILITY');
  console.log('====================');

  const command = (process.argv[2] as Command) || 'check';

  if (!COMMANDS.includes(command)) {
    error(`Unknown command: ${command}`);
    console.log(`Available commands: ${COMMANDS.join(', ')}`);
    process.exit(1);
  }

  const results: Record<string, boolean> = {};

  if (command === 'check' || command === 'all') {
    results.check = await quickCheck();
  }

  if (command === 'provider' || command === 'all') {
    results.provider = await testProvider();
  }

  if (command === 'integration' || command === 'all') {
    results.integration = await testIntegration();
  }

  if (command === 'mapping' || command === 'all') {
    results.mapping = await testMapping();
  }

  // Summary
  if (command === 'all') {
    section('TEST SUMMARY');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`  ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    });

    const allPassed = Object.values(results).every((r) => r);
    console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);

    if (!allPassed) {
      process.exit(1);
    }
  }
}

main().catch(console.error);
