import {pathToFileURL} from 'node:url';
import {smsFromEnv,credentialsValid,smsEnabled,twilioRequest} from '../lib/twilio-verify.mjs';

// Read-only GET of the selected service. Never creates a service or sends an SMS.
export async function preflight(env,fetcher=fetch){
  const sms=smsFromEnv(env);
  const missing=['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_VERIFY_SERVICE_SID'].filter(key=>!env[key]);
  if(missing.length||!credentialsValid(sms))return {ready:false,missing,credentialsValid:false,smsSendingEnabled:false};
  try{
    const service=await twilioRequest(sms,'',undefined,fetcher);
    const checks={serviceMatches:service.sid===sms.serviceSid,accountMatches:service.account_sid===sms.accountSid,
      sixDigitCode:service.code_length===6,customCodesDisabled:service.custom_code_enabled===false,
      sharingWarningEnabled:service.do_not_share_warning_enabled===true};
    return {ready:Object.values(checks).every(Boolean),checks,smsSendingEnabled:smsEnabled(sms),
      stillRequired:['Verify Geo Permissions: Romania only','Fraud Guard enabled','10-minute provider validity','Actual authorized SMS delivery/check','Hosted two-account and physical iPhone tests']};
  }catch(error){return {ready:false,errorCode:error.code||'PREFLIGHT_FAILED',smsSendingEnabled:false};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=await preflight(process.env);
  console.log(JSON.stringify(report,null,2));
  if(!report.ready)process.exitCode=2;
}
