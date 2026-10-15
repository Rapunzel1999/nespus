import document from '../../../lib/document.html?raw';
import { securityHeaders } from '../../../lib/api.mjs';
export function GET() { return new Response(document,{headers:{...securityHeaders,'Content-Type':'text/html; charset=utf-8'}}); }
