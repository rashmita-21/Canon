// Run with: npm test   (uses tsx + node:assert, no extra framework)
import assert from 'node:assert/strict';
import { checkRuleBased, calculateContrast } from '../src/engine';
import { INITIAL_FACTS, SAMPLE_DATA } from '../src/data';

const TODAY = '2026-11-07';
const run = (content: string, img?: any) => checkRuleBased(content, INITIAL_FACTS, img, TODAY);
const cats = (c: string) => run(c).map(f => f.category);
let passed = 0;
const t = (name: string, fn: () => void) => { fn(); passed++; console.log('  ok -', name); };

t('clean sample produces zero findings (no false flags)', () => {
  assert.equal(run(SAMPLE_DATA[0].content).length, 0);
});
t('banned guarantee term is caught', () => {
  assert.ok(run('Lumen Saver: guaranteed 8% returns, the cheapest in India!').some(f => f.category === 'Terminology'));
});
t('legacy product name "Lumen Saver" is caught', () => {
  assert.ok(run('Check out Lumen Saver accounts.').some(f => /Term-1\.2/.test(f.ruleId)));
});
t('unsupported superlative is caught', () => {
  assert.ok(cats('We are the cheapest bank in India.').includes('Claim'));
});
t('expired ledger fact (festive 5% offer, expired 31 Oct) is flagged stale', () => {
  assert.ok(cats(SAMPLE_DATA[2].content).includes('Stale fact'));
});
t('expired audited metric (2.1 million, expired 30 Sep) is flagged stale', () => {
  assert.ok(run('Trusted by 2.1 million customers.').some(f => /F3/.test(f.ruleId)));
});
t('wrong rate vs ledger (8% vs verified 6.5%) is flagged', () => {
  assert.ok(run('Earn 8% p.a. on savings.').length > 0);
});
t('low-contrast image is flagged (Accessibility)', () => {
  const f = run('Lumen Savings: Bank with clarity.', { altText: 'Promo banner', textColor: '#FFC107', bgColor: '#FFFFFF' });
  assert.ok(f.some(x => x.category === 'Accessibility'));
});
t('missing alt text is flagged', () => {
  const f = run('Lumen Savings.', { altText: '', textColor: '#000000', bgColor: '#FFFFFF' });
  assert.ok(f.some(x => /alt/i.test(x.ruleName + x.whyFlagged)));
});
t('contrast maths: black on white = 21:1', () => {
  assert.equal(Math.round(calculateContrast('#000000', '#FFFFFF').ratio), 21);
});
t('every finding cites a rule and an exact span', () => {
  for (const s of SAMPLE_DATA) for (const f of run(s.content)) {
    assert.ok(f.ruleId && f.whyFlagged);
    assert.ok(s.content.slice(f.startOffset, f.endOffset).length > 0);
  }
});
console.log(`\n${passed} tests passed`);
