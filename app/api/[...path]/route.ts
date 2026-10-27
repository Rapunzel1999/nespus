import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import {smsFromEnv} from '../../../lib/twilio-verify.mjs';
import { handleApi } from '../../../lib/api.mjs';
async function handle(req:Request){
  return handleApi(req,env.DB,{
    principal:await getChatGPTUser(),
    moderatorEmails:(env.MODERATOR_EMAILS||'').split(','),
    sms:smsFromEnv(env),
  });
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
