import { createHandler } from './handler.js';

Deno.serve(createHandler({
  projectUrl: Deno.env.get('SUPABASE_URL'),
  publicKey: Deno.env.get('SUPABASE_ANON_KEY'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  allowedOrigins: ['https://ck1020974.github.io'],
}));
