import test from 'node:test';
import assert from 'node:assert/strict';

import {
  followupPlanForDelay,
  followupPlanForScore,
  hasMarketingConsent,
  independenceCampaignMessage,
  portalAccessToken,
  validPortalAccessToken,
} from '../server.mjs';

test('creates exact immediate and short follow-up timings', () => {
  const createdAt = '2026-08-03T10:00:00.000Z';
  assert.equal(followupPlanForDelay(0, createdAt)[0].dueAt, createdAt);
  assert.equal(followupPlanForDelay(5, createdAt)[0].dueAt, '2026-08-03T10:05:00.000Z');
  assert.equal(followupPlanForDelay(10, createdAt)[0].dueAt, '2026-08-03T10:10:00.000Z');
});

test('hot lead follow-up plan uses 24-hour, 48-hour and day-4 timing', () => {
  const plan = followupPlanForScore(85, '2026-08-03T10:00:00.000Z');
  assert.deepEqual(plan.map((item) => item.day), [1, 2, 4]);
  assert.deepEqual(plan.map((item) => item.dueAt), [
    '2026-08-04T10:00:00.000Z',
    '2026-08-05T10:00:00.000Z',
    '2026-08-07T10:00:00.000Z',
  ]);
});

test('client portal token accepts the matching lead and rejects tampering', () => {
  const token = portalAccessToken('lead-123');
  assert.equal(validPortalAccessToken('lead-123', token), true);
  assert.equal(validPortalAccessToken('lead-456', token), false);
  const replacement = token.endsWith('0') ? '1' : '0';
  assert.equal(validPortalAccessToken('lead-123', `${token.slice(0, -1)}${replacement}`), false);
});

test('marketing campaign requires explicit consent and respects opt-out', () => {
  assert.equal(hasMarketingConsent({ marketingOptIn: true }), true);
  assert.equal(hasMarketingConsent({ marketingOptIn: true, optedOut: true }), false);
  assert.equal(hasMarketingConsent({}), false);
});

test('Independence campaign copy contains the approved offer window', () => {
  const message = independenceCampaignMessage('Raza');
  assert.match(message, /14% OFF/);
  assert.match(message, /31 August 2026/);
  assert.match(message, /Reply AZADI/);
});
