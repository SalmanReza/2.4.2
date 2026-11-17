import test from 'node:test';
import assert from 'node:assert/strict';
import { prayerBlockTotal } from '../src/prayer-layers.js';
import { eventRecoverable, recoverableFards, twoPrecedingFard, recoveryEligible } from '../src/recovery.js';
import { materMarkup } from '../src/astrolabe-view.js';
import { readText } from './helpers/read-text.js';

const at = h => new Date(Date.UTC(2026, 10, 16, h));

test('obligatory blocks total Sunnah, Fard and Nafl in the Hanafi arrangement', () => {
  assert.equal(prayerBlockTotal('fajr'), 4);
  assert.equal(prayerBlockTotal('dhuhr'), 12);
  assert.equal(prayerBlockTotal('asr'), 8);
  assert.equal(prayerBlockTotal('maghrib'), 7);
  assert.equal(prayerBlockTotal('isha'), 12);
});

test('a locked recent Fard can be recovered when the two Fard just before it are recorded', () => {
  const events = [
    { kind: 'fard', key: 'fajr', dateKey: 'd', start: at(5), end: at(6) },
    { kind: 'fard', key: 'dhuhr', dateKey: 'd', start: at(12), end: at(15) },
    { kind: 'fard', key: 'asr', dateKey: 'd', start: at(15), end: at(17) }
  ];
  const now = at(18);
  const recorded = new Set(['d:fajr', 'd:dhuhr']);
  const isRecorded = event => recorded.has(`${event.dateKey}:${event.key}`);
  assert.equal(recoveryEligible(twoPrecedingFard(events, now), isRecorded), false);
  assert.equal(eventRecoverable(events, events[2], now, isRecorded), true);
  const list = recoverableFards(events, now, { isRecorded, isLocked: event => event.key === 'asr' });
  assert.deepEqual(list.map(event => event.key), ['asr']);
});

test('v2.4.2 source: voluntary pre-reminders, prohibited countdown, connectors, verse card, astrolabe numerals', () => {
  const app = readText('../src/app.js', import.meta.url);
  const css = readText('../src/styles.css', import.meta.url);
  const html = readText('../index.html', import.meta.url);
  const pre = app.slice(app.indexOf('function renderPreReminderSettings'), app.indexOf('function prefScheduleEvents'));
  assert.match(pre, /REMINDER_VOLUNTARY/);
  assert.match(pre, /pre-reminder-\$\{item\.key\}/);
  assert.match(app, /Remaining in this prohibited time/);
  assert.match(app, /data-mode="/);
  assert.match(app, /eventRecoverable\(/);
  assert.doesNotMatch(app, /addEventListener\('pointerleave', cancelRecoveryHold\)/);
  assert.match(html, /id="avPlateNumerals"/);
  assert.match(html, /for each prayer\. 0 turns that reminder off/);
  const tail = css.slice(css.lastIndexOf('v2.4.2'));
  assert.match(tail, /body \.live-event \.part-link[\s\S]{0,500}display:\s*block/);
  const progress = app.slice(app.indexOf('function renderProgress'), app.indexOf('function partsHtml'));
  assert.match(progress, /showVerse: !!verse/);
  assert.doesNotMatch(progress, /verseText/);
  assert.match(progress, /voluntaryReward|reward-phrase is-verse|is-verse/);
  const mater = materMarkup('en');
  assert.ok(mater.lastIndexOf('class="av-num"') > mater.indexOf('r="150.5"'), 'hour numerals paint after the covering ring');
});
