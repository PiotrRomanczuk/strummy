import { performance } from 'node:perf_hooks';

type StepStatus = 'ok' | 'fail';

type StepResult = {
  message: string;
  status: StepStatus;
  durationMs: number;
  detail?: string;
};

const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export class Reporter {
  private results: StepResult[] = [];
  private startedAt = performance.now();

  section(title: string): void {
    console.log(`\n${C.bold(title)}`);
  }

  info(message: string): void {
    console.log(`  ${C.gray(message)}`);
  }

  async step<T>(message: string, op: () => Promise<T>): Promise<T | undefined> {
    const t0 = performance.now();
    try {
      const value = await op();
      const dt = performance.now() - t0;
      this.results.push({ message, status: 'ok', durationMs: dt });
      console.log(`  ${C.green('[ok]')}   ${message} ${C.gray(`(${dt.toFixed(0)}ms)`)}`);
      return value;
    } catch (err) {
      const dt = performance.now() - t0;
      const detail = err instanceof Error ? err.message : String(err);
      this.results.push({ message, status: 'fail', durationMs: dt, detail });
      console.log(`  ${C.red('[fail]')} ${message}`);
      detail.split('\n').forEach((line) => console.log(`         ${C.red(line)}`));
      return undefined;
    }
  }

  summary(): void {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === 'ok').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    const dt = performance.now() - this.startedAt;
    const verdict = failed === 0 ? C.green(C.bold('PASS')) : C.red(C.bold('FAIL'));
    console.log(`\n${verdict}  ${passed}/${total} steps in ${(dt / 1000).toFixed(1)}s`);
    if (failed > 0) {
      console.log(C.red(`${failed} step(s) failed.`));
    }
  }

  exitCode(): number {
    return this.results.some((r) => r.status === 'fail') ? 1 : 0;
  }
}
