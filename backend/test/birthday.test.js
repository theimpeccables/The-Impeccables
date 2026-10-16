import test from 'node:test';
import assert from 'node:assert/strict';
import { birthdayDatePartsAtTimezone, isBirthdayDateMatch, renderBirthdayTemplate, resolveLocalDateTime } from '../src/services/birthdayService.js';

test('calendar date boundaries are evaluated in the configured club timezone', () => {
  const justAfterKolkataMidnight = new Date('2026-10-15T18:31:00.000Z');
  const parts = birthdayDatePartsAtTimezone(justAfterKolkataMidnight, 'Asia/Kolkata');
  assert.deepEqual(parts, { year: 2026, month: 10, day: 16 });
  assert.equal(isBirthdayDateMatch(new Date('2000-10-16T00:00:00.000Z'), parts), true);
  assert.equal(isBirthdayDateMatch(new Date('2000-10-15T00:00:00.000Z'), parts), false);
});

test('Feb 29 birthdays are observed on Feb 28 in non-leap years only', () => {
  const leapBirthday = new Date('2000-02-29T00:00:00.000Z');
  assert.equal(isBirthdayDateMatch(leapBirthday, { year: 2025, month: 2, day: 28 }), true);
  assert.equal(isBirthdayDateMatch(leapBirthday, { year: 2025, month: 3, day: 1 }), false);
  assert.equal(isBirthdayDateMatch(leapBirthday, { year: 2024, month: 2, day: 29 }), true);
});

test('scheduled local send time converts to the expected UTC instant', () => {
  const instant = resolveLocalDateTime({ year: 2026, month: 10, day: 16, hour: 9, minute: 0 }, 'Asia/Kolkata');
  assert.equal(instant.toISOString(), '2026-10-16T03:30:00.000Z');
});

test('birthday template HTML escapes member-controlled values', () => {
  const rendered = renderBirthdayTemplate({ subject: 'Hello {{firstName}}', bodyHtml: '<p>{{firstName}} {{domain}}</p>', bodyText: '{{fullName}}', includeClubSignature: false }, { firstName: '<img>', lastName: 'Member' }, '<script>');
  assert.equal(rendered.subject, 'Hello <img>');
  assert.match(rendered.html, /&lt;img&gt;/);
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.doesNotMatch(rendered.html, /<script>/);
});
