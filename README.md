# Job Application Tracker

A fast job tracker built because Google Sheets gets messy when you're applying to hundreds of jobs. 

Works immediately in your browser without signing up (saves locally), or you can create an account to sync across devices via Supabase. Includes a companion Chrome extension to save postings with one click from LinkedIn or Indeed.

**Live site:** [my-applications-tracker.vercel.app](https://my-applications-tracker.vercel.app) (no signup required)

## What it does

- **Track applications**: Keep tabs on company, role, date applied, link, and status (Applied, Interview, Offer, Rejected).
- **Guest mode**: Start adding jobs right away without creating an account. Saves to your browser's local storage.
- **Account sync**: Sign in with email to back up jobs to Supabase (PostgreSQL). Guest jobs migrate automatically when you log in.
- **Chrome extension**: Click the extension icon on any job posting to auto-fill the title/URL and save it straight to your tracker.
- **CSV import & export**: Backup your data or import hundreds of jobs from an existing spreadsheet.

## Tech stack

- Next.js + React
- TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Chrome Extension (Manifest V3)
- Hosted on Vercel

## Running locally

```bash
git clone https://github.com/SalmanLimbada/job-application-tracker.git
cd job-application-tracker
pnpm install
```

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the dev server:

```bash
pnpm dev
```

Run the schema in `supabase/schema.sql` inside your Supabase SQL editor if you're setting up a fresh database.

## Loading the Chrome extension

1. Go to `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension/` folder in this repo.
