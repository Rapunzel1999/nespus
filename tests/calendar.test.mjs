import test from 'node:test';
import assert from 'node:assert/strict';
import ICAL from 'ical.js';
import {viewingCalendar} from '../lib/calendar.mjs';
test('calendar parses and preserves winter, summer and both repeated Bucharest instants',()=>{
  for(const date of ['2026-01-12T10:00:00Z','2026-07-12T10:00:00Z','2026-10-25T00:30:00Z','2026-10-25T01:30:00Z']){
    const startsAt=Date.parse(date),text=viewingCalendar({id:'a'.repeat(32),title:'Locuință DEMO',district:'Mărăști',startsAt});
    const calendar=new ICAL.Component(ICAL.parse(text));ICAL.TimezoneService.register(calendar.getFirstSubcomponent('vtimezone'));
    const event=new ICAL.Event(calendar.getFirstSubcomponent('vevent'));assert.equal(event.startDate.toJSDate().getTime(),startsAt);assert.equal(event.endDate.toJSDate().getTime(),startsAt);assert.equal(event.component.getFirstPropertyValue('class'),'PRIVATE');assert.match(text,/TZID:Europe\/Bucharest/);assert.equal(event.attendees.length,0);
  }
});
test('calendar folds UTF-8 lines, prevents property injection and keeps a stable event UID',()=>{
  const input={id:'b'.repeat(32),title:'Ășț '.repeat(70)+'\r\nATTENDEE:mailto:evil@example.invalid',district:'Mărăști; Centru',startsAt:Date.parse('2026-07-12T10:00:00Z')};
  const text=viewingCalendar(input);for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
  const event=new ICAL.Event(new ICAL.Component(ICAL.parse(text)).getFirstSubcomponent('vevent'));assert.equal(event.summary,'Vizionare · '+input.title.replace('\r\n','\n'));assert.equal(event.attendees.length,0);assert.equal(event.uid,input.id+'@intre-noi.local');assert.equal(event.component.getFirstPropertyValue('location'),'Mărăști; Centru · Cluj-Napoca');
});
