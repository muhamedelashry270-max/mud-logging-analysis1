# Mud Logging Analysis — production starter

Next.js + Supabase application for the public Mud Logging Analysis website.

## Current behavior
- Guest users can calculate without signing in.
- Registered users can use email magic-link authentication.
- Signed-in users can save, list, load, and delete their own analyses.
- The database migration enables Row Level Security and grants access only when `auth.uid() = user_id`.
- PDF output uses the browser's Print / Save PDF flow; JSON export works locally.
- All three calculation methods are transcribed in `lib/calculations.ts` from the supplied workbook's formulas.

## Workbook-specific notes
- The GWR formula order is retained exactly (`E2<0.5` precedes `E2<0.175`). The latter branch is unreachable for ordinary numeric values.
- Pixler K25's `IF(OR(...))` has no false-result argument; the workbook's cached sample output is `0` and this implementation preserves that behavior.
- The final interpretation cells in the workbook are blank; this application provides a user-entered final conclusion instead of inventing an automatic combined verdict.
- This is a faithful formula transcription, not yet a fully validated engineering product. Test all boundary conditions and operational edge cases with the workbook owner before field use.

## Local setup
1. Install Node.js 20.9+.
2. `npm install`
3. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable/anon key.
4. In Supabase SQL Editor, run `supabase/migrations/001_initial_schema.sql`.
5. In Supabase Authentication > URL Configuration, set the Site URL to your Vercel URL and add `http://localhost:3000/auth/callback` and `https://YOUR_DOMAIN/auth/callback` to Redirect URLs.
6. `npm run dev`.
7. Run `npm run test:calc` to check the workbook sample regression fixture.

## Vercel deployment
1. Push this folder to a GitHub repository.
2. Import the repository in Vercel; framework preset should be Next.js.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project environment variables.
4. Deploy, then add the production domain to Supabase Auth URL Configuration.

Never expose a Supabase `service_role` key in browser or `NEXT_PUBLIC_` variables. The app intentionally uses only the publishable/anon key and relies on RLS for saved-record privacy.

## Production checklist still required
- Create Supabase and Vercel projects and connect a GitHub repository.
- Set auth email templates, allowed redirect URLs, CAPTCHA / abuse protection, and rate limits.
- Add a privacy notice, terms, contact/ownership details, data retention policy, and cookie/session disclosure as appropriate.
- Complete Excel regression tests for boundary cases, zeros, negative increments, blank values, and formula error cases.
- Confirm whether the workbook chart's fixed construction-series display should be replicated in addition to the dynamically recalculated intersection lines.
- Confirm the final public domain and brand identity.
