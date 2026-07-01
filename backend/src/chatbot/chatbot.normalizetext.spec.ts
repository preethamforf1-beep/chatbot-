import 'reflect-metadata';
import * as assert from 'assert/strict';
import { ChatbotService } from './chatbot.service';

const configStub = { get: (_k: string) => undefined } as any;
const dbStub = {} as any;
function svc() { return new ChatbotService(dbStub, configStub); }

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

console.log('\nnormalizeText / fuzzyContains suite\n');

// ── normalizeText: typo-map corrections ──────────────────────────────────────

test('"balnce" normalizes to "balance" via typo map', () => {
  assert.equal(svc().normalizeText('balnce'), 'balance');
});

test('"leeeave" normalizes to "leave" via repeated-char collapse', () => {
  assert.equal(svc().normalizeText('leeeave'), 'leave');
});

test('"salry" normalizes to "salary" via typo map', () => {
  assert.equal(svc().normalizeText('salry'), 'salary');
});

test('"hloiday" normalizes to "holiday" via typo map', () => {
  assert.equal(svc().normalizeText('hloiday'), 'holiday');
});

// ── fuzzyContains: tolerant keyword matching ──────────────────────────────────

test('"aply leav" → fuzzyContains("leave") = true (leav distance 1)', () => {
  assert.ok(svc().fuzzyContains('aply leav', 'leave'));
});

test('"my payslp" → fuzzyContains("payslip") = true (payslp distance 1)', () => {
  assert.ok(svc().fuzzyContains('my payslp', 'payslip'));
});

test('"cancl my leave" → fuzzyContains("cancel") = true (cancl distance 1)', () => {
  assert.ok(svc().fuzzyContains('cancl my leave', 'cancel'));
});

test('"profle" → fuzzyContains("profile") = true (profle distance 1)', () => {
  assert.ok(svc().fuzzyContains('profle', 'profile'));
});

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : ''}\n`);
if (failed > 0) process.exit(1);
