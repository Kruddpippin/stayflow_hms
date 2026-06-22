# Deploy StayFlow to Vercel

The whole project is in this folder and is deploy-ready. Pick ONE option.

## Environment variables (needed by both options)

    VITE_SUPABASE_URL=https://jkregqlkcazkujfdznif.supabase.co
    VITE_SUPABASE_ANON_KEY=sb_publishable_8I-0x6rVeKwopG8QnIBcUQ_ZcjQ9jY2

(The anon/publishable key is safe in the browser — every table is protected by Row Level Security.)

## Option A — Vercel CLI (fastest)

From inside the stayflow-hms folder:

    npm install              # install dependencies
    npm install -g vercel    # if you don't have the CLI
    vercel login             # one-time
    vercel link              # create/link a project
    vercel env add VITE_SUPABASE_URL production       # paste the URL
    vercel env add VITE_SUPABASE_ANON_KEY production   # paste the key
    vercel --prod            # build + deploy, prints your live URL

## Option B — GitHub + Vercel dashboard

1. Create a new GitHub repo and push this folder to it.
2. In Vercel: Add New -> Project -> Import that repo.
3. Framework preset auto-detects as Vite (build `npm run build`, output `dist`).
4. Add the two environment variables above.
5. Deploy.

`vercel.json` already rewrites all routes to index.html, so client-side routes
(/dashboard, /portal, etc.) work on refresh.

## After it's live

Log in with a demo account:

| Role  | Email              | Password     |
|-------|--------------------|--------------|
| Admin | admin@stayflow.com | Password123! |
| Staff | staff@stayflow.com | Password123! |
| Guest | guest@stayflow.com | Password123! |

Then in Supabase -> Authentication -> URL Configuration, add your Vercel URL to
the allowed Site/Redirect URLs so auth flows resolve correctly.
