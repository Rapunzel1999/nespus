// RFC 5545; current Europe/Bucharest EU rules, checked against IANA tzdb 2026-11-01.
const zone='Europe/Bucharest';
const localTime=stamp=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(stamp).map(p=>[p.type,p.value]));return parts.year+parts.month+parts.day+'T'+parts.hour+parts.minute+parts.second;};
const utc=stamp=>new Date(stamp).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const escapeText=value=>String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const fold=line=>{const lines=[];let current='',length=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(length+bytes>75){lines.push(current);current=' ';length=1;}current+=char;length+=bytes;}lines.push(current);return lines.join('\r\n');};
export function viewingCalendar({id,title,district,startsAt},now=Date.now()){
  if(!/^[a-f0-9]{32}$/.test(id)||!Number.isFinite(startsAt))throw Error('Invalid calendar event');
  // Both occurrences of the autumn repeated hour use UTC; calendar clients disagree on resolving ambiguous local values.
  const repeated=[-3600000,3600000].some(offset=>localTime(startsAt)===localTime(startsAt+offset));
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Intre noi//Private viewing//RO','CALSCALE:GREGORIAN','X-WR-TIMEZONE:'+zone,
    'BEGIN:VTIMEZONE','TZID:'+zone,'BEGIN:STANDARD','DTSTART:19961027T040000','TZOFFSETFROM:+0300','TZOFFSETTO:+0200','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','TZNAME:EET','END:STANDARD',
    'BEGIN:DAYLIGHT','DTSTART:19960331T030000','TZOFFSETFROM:+0200','TZOFFSETTO:+0300','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','TZNAME:EEST','END:DAYLIGHT','END:VTIMEZONE',
    'BEGIN:VEVENT','UID:'+id+'@intre-noi.local','DTSTAMP:'+utc(now),repeated?'DTSTART:'+utc(startsAt):'DTSTART;TZID='+zone+':'+localTime(startsAt),
    'SUMMARY:'+escapeText('Vizionare · '+title),'LOCATION:'+escapeText(district+' · Cluj-Napoca'),'DESCRIPTION:'+escapeText('Ora de început este confirmată în Între noi. Durata și adresa exactă se stabilesc în conversație. Verifică eventualele schimbări în aplicație.'),'CLASS:PRIVATE','STATUS:CONFIRMED','TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR'];
  return lines.map(fold).join('\r\n')+'\r\n';
}
