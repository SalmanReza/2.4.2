/* Prayer Completion Recovery. Records a prayer the user says they performed
   and forgot to record. It is not Qada, and it cannot record a prayer that
   was not performed. The two Fard prayers immediately before the one being
   recovered must both already be recorded. */

const ms = value => (value instanceof Date ? value.getTime() : Number(value));
const identity = event => `${event?.dateKey || ''}:${event?.key || ''}`;

/** The two Fard events whose period has already ended, nearest to `now`. */
export function twoPrecedingFard(events, now) {
  const t = ms(now);
  return (events || [])
    .filter(event => event && event.kind === 'fard' && Number.isFinite(ms(event.end)) && ms(event.end) <= t)
    .sort((a, b) => ms(b.end) - ms(a.end))
    .slice(0, 2);
}

/** The two Fard prayers that ended at or before this one, nearest to it. */
export function twoFardBefore(events, event) {
  const end = ms(event?.end);
  if (!Number.isFinite(end)) return [];
  const id = identity(event);
  return (events || [])
    .filter(item => item && item.kind === 'fard' && identity(item) !== id && Number.isFinite(ms(item.end)) && ms(item.end) <= end)
    .sort((a, b) => ms(b.end) - ms(a.end))
    .slice(0, 2);
}

export function recoveryEligible(preceding, isRecorded) {
  return Array.isArray(preceding) && preceding.length === 2 && preceding.every(event => isRecorded(event));
}

/** A locked, ended, unrecorded Fard can be recovered when the two Fard prayers just before it are both recorded. */
export function eventRecoverable(events, event, now, isRecorded) {
  if (!event || event.kind !== 'fard' || isRecorded(event)) return false;
  if (!Number.isFinite(ms(event.end)) || ms(event.end) > ms(now)) return false;
  return recoveryEligible(twoFardBefore(events, event), isRecorded);
}

/** Locked, unrecorded Fard events that the on-screen rule actually allows.
    When the two most recently ended Fard prayers are both recorded, every older
    locked gap stays recoverable (the original rule). A prayer is also recoverable
    on its own when the two Fard prayers just before it are recorded, so a locked
    recent prayer is not stuck behind itself. */
export function recoverableFards(events, now, { isRecorded, isLocked }) {
  const preceding = twoPrecedingFard(events, now);
  const globalOk = recoveryEligible(preceding, isRecorded);
  const skip = new Set(globalOk ? preceding.map(identity) : []);
  return (events || [])
    .filter(event => event && event.kind === 'fard' && !skip.has(identity(event)))
    .filter(event => !isRecorded(event) && isLocked(event))
    .filter(event => globalOk || eventRecoverable(events, event, now, isRecorded))
    .sort((a, b) => ms(b.start) - ms(a.start));
}

export const RECOVERY_CONFIRM = Object.freeze({
  en: 'I performed this prayer but forgot to record it.',
  bn: 'আমি এই নামাজ পড়েছি, কিন্তু রেকর্ড করতে ভুলে গেছি।'
});
