import { expect, test } from 'bun:test';
import { completionDate, parseDuration, durationLabel, civilToday } from '../../src/modules/programs/schedule.mjs';
test('calendar periods use clamped anniversaries and inclusive completion days',()=>{
  expect(completionDate('2026-11-24','1 month')).toBe('2026-12-23');
  expect(completionDate('2027-01-31','1 month')).toBe('2027-02-27');
  expect(completionDate('2028-01-31','1 month')).toBe('2028-02-28');
  expect(completionDate('2026-12-24','2 months')).toBe('2027-02-23');
  expect(completionDate('2026-11-24','1 day')).toBe('2026-11-24');
  expect(completionDate('2026-11-24','1 week')).toBe('2026-11-30');
});
test('ambiguous durations and invalid dates never acquire invented defaults',()=>{
  for(const value of ['8–12 weeks','a semester','0 months','-1 day','1.5 weeks'])expect(parseDuration(value)).toBeNull();
  expect(()=>completionDate('2026-02-30','1 month')).toThrow();
  expect(parseDuration('1 calendar month')).toEqual({quantity:1,unit:'months'});
  expect(durationLabel({quantity:2,unit:'weeks'})).toBe('2 weeks');
  expect(civilToday(new Date('2026-11-17T20:00:00Z'))).toBe('2026-11-18');
});
