import 'reflect-metadata';
import * as assert from 'assert/strict';
import { ChatbotService } from './chatbot.service';

// Minimal stubs — classifyRoute never touches DB or config
const configStub = { get: (_k: string) => undefined } as any;
const dbStub = {} as any;

function svc() { return new ChatbotService(dbStub, configStub); }

const user = { employeeId: 'EMP001', name: 'Tester', role: 'employee' };

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(e as Error).message}`);
    failed++;
  }
}

console.log('\nclassifyRoute — privacy red-team suite\n');

// ── Salary / payroll queries always route local ───────────────────────────────

test('"what does Rahul earn" → local (other-employee earnings)', () => {
  assert.ok(svc().classifyRoute('what does Rahul earn', user).useLocal);
});

test('"show me everyone\'s salary" → local (bulk payroll query)', () => {
  assert.ok(svc().classifyRoute("show me everyone's salary", user).useLocal);
});

test('"my payslip" → local', () => {
  assert.ok(svc().classifyRoute('my payslip', user).useLocal);
});

test('"my form 16" → local (normalised to form16 keyword)', () => {
  assert.ok(svc().classifyRoute('my form 16', user).useLocal);
});

// ── Leave actions always route local ─────────────────────────────────────────

test('"cancel my leave" → local', () => {
  assert.ok(svc().classifyRoute('cancel my leave', user).useLocal);
});

test('"apply CL for 5 July" → local', () => {
  assert.ok(svc().classifyRoute('apply CL for 5 July', user).useLocal);
});

// ── Ambiguous single-token messages fail safe to local ───────────────────────

test('"salary" (single word) → local', () => {
  assert.ok(svc().classifyRoute('salary', user).useLocal);
});

test('"leave" (single word) → local', () => {
  assert.ok(svc().classifyRoute('leave', user).useLocal);
});

test('"pay" (single word) → local', () => {
  assert.ok(svc().classifyRoute('pay', user).useLocal);
});

test('"hello" (single word) → local (fail-safe single token)', () => {
  assert.ok(svc().classifyRoute('hello', user).useLocal);
});

test('"xyz" (unknown single word) → local (fail-safe)', () => {
  assert.ok(svc().classifyRoute('xyz', user).useLocal);
});

// ── Pending draft forces local regardless of message content ─────────────────

test('any message with pending leave draft → local', () => {
  const s = svc();
  (s as any).leaveDrafts.set('EMP001', {
    data: { leaveType: 'CL', leaveDate: '2026-07-01', startDate: '2026-07-01', endDate: '2026-07-01', duration: 1, dayType: 'Full Day', reason: '' },
    savedAt: Date.now(),
  });
  assert.ok(s.classifyRoute('yes', user).useLocal);
});

// ── Expired draft does NOT force local ───────────────────────────────────────

test('expired draft (>30 min) is evicted and does not block AI routing', () => {
  const s = svc();
  const staleTs = Date.now() - 31 * 60 * 1000; // 31 minutes ago
  (s as any).leaveDrafts.set('EMP001', {
    data: { leaveType: 'CL', leaveDate: '2026-07-01', startDate: '2026-07-01', endDate: '2026-07-01', duration: 1, dayType: 'Full Day', reason: '' },
    savedAt: staleTs,
  });
  // "what are the office hours" has no payroll/leave keywords, 5 tokens → AI
  assert.equal(s.classifyRoute('what are the office hours', user).useLocal, false);
});

// ── Safe general queries may go to AI ────────────────────────────────────────

test('"what are the company holidays" → AI route', () => {
  assert.equal(svc().classifyRoute('what are the company holidays', user).useLocal, false);
});

test('"how do I contact IT support" → AI route', () => {
  assert.equal(svc().classifyRoute('how do I contact IT support', user).useLocal, false);
});

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : ''}\n`);
if (failed > 0) process.exit(1);
