import { env } from 'cloudflare:workers';
import { handleApi } from '../../../lib/api.mjs';
const handle = (req:Request) => handleApi(req,env.DB);
export { handle as GET, handle as POST, handle as DELETE };
