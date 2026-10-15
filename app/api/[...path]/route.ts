import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handleApi } from '../../../lib/api.mjs';
async function handle(req:Request){
  return handleApi(req,env.DB,{
    principal:await getChatGPTUser(),
    moderatorEmails:(env.MODERATOR_EMAILS||'').split(','),
    sms:{accountSid:env.TWILIO_ACCOUNT_SID,authToken:env.TWILIO_AUTH_TOKEN,serviceSid:env.TWILIO_VERIFY_SERVICE_SID},
  });
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
