import {fail} from './model.mjs';

export const VERIFY_TTL = 10 * 60_000;
export const SMS_COOLDOWN = 60_000;
export function smsFromEnv(env) {
  return {accountSid:env.TWILIO_ACCOUNT_SID,authToken:env.TWILIO_AUTH_TOKEN,
    serviceSid:env.TWILIO_VERIFY_SERVICE_SID,enabled:env.TWILIO_VERIFY_ENABLED,
    totalLimit:env.TWILIO_VERIFY_TOTAL_SEND_LIMIT};
}
export function credentialsValid(sms) {
  return /^AC[\da-f]{32}$/i.test(sms.accountSid||'') &&
    /^VA[\da-f]{32}$/i.test(sms.serviceSid||'') &&
    typeof sms.authToken==='string' && /^[\x21-\x7e]{16,256}$/.test(sms.authToken);
}
export function smsEnabled(sms) {
  const limit=Number(sms.totalLimit);
  return sms.enabled==='true' && credentialsValid(sms) && Number.isInteger(limit) && limit>0 && limit<=100;
}

// Server-only; no user-selected URL, redirects, retries, custom OTP or channel fallback.
export async function twilioRequest(sms,resource,fields,fetcher=fetch) {
  if(!credentialsValid(sms))fail(503,'Configurarea serviciului SMS este incompletă.','SMS_UNAVAILABLE');
  if(!['','Verifications','VerificationCheck'].includes(resource))throw new Error('Unsupported Verify operation');
  let response,data;
  try {
    response=await fetcher('https://verify.twilio.com/v2/Services/'+sms.serviceSid+(resource?'/'+resource:''),{
      method:resource?'POST':'GET',redirect:'error',
      headers:{Authorization:'Basic '+btoa(sms.accountSid+':'+sms.authToken),...(resource?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
      ...(resource?{body:new URLSearchParams(fields)}:{}),signal:AbortSignal.timeout(12_000),
    });
    data=await response.json();
  } catch { fail(503,'Serviciul SMS nu răspunde. Încearcă mai târziu.','SMS_UNAVAILABLE'); }
  if(!response.ok){
    if(response.status===429)fail(429,'Prea multe solicitări SMS. Încearcă mai târziu.','SMS_RATE_LIMIT');
    if(response.status===401||response.status===403||response.status>=500)fail(503,'Serviciul SMS este temporar indisponibil.','SMS_UNAVAILABLE');
    if(resource==='VerificationCheck'&&(response.status===404||data?.code===60202))fail(400,'Codul a expirat sau nu mai poate fi folosit. Solicită un cod nou.','SMS_EXPIRED');
    fail(400,'Solicitarea SMS nu a fost acceptată. Verifică datele sau încearcă mai târziu.','SMS_REJECTED');
  }
  if(!data||typeof data!=='object'||Array.isArray(data))fail(503,'Răspuns SMS invalid.','SMS_UNAVAILABLE');
  return data;
}

export function matchesVerification(result,sms,phone,sid) {
  return /^VE[\da-f]{32}$/i.test(result.sid||'') && (!sid||result.sid===sid) &&
    result.account_sid===sms.accountSid && result.service_sid===sms.serviceSid &&
    result.to===phone && result.channel==='sms';
}
