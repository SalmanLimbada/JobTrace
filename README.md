# JobTrace

A web application and companion browser extension for tracking job applications. Designed as a faster, more organized alternative to spreadsheets when managing high volumes of applications.

Live site: [https://job-trace-web.vercel.app/](https://job-trace-web.vercel.app/)

## Features

- **Duplicate Detection**: Identifies whether you have already applied to a job using posting IDs, canonical URLs, and company/role matching.
- **Companion Chrome Extension**: Clip job details from job boards or post-application confirmation pages directly into your tracker. Field visibility and custom fields can be configured from extension settings.
- **Customizable Pipeline**: Add, rename, and reorder application stages (e.g. Applied, Online Assessment, Interview, Offer, Rejected) to match your workflow.
- **Configurable Columns and Fields**: Toggle standard columns, reorder table headers, and create custom fields for salary, notes, deadlines, and other details.
- **Bulk Actions**: Select and remove multiple applications at once.
- **Data Portability**: Import and export applications via CSV.
- **Storage and Sync**: Supports local browser storage as well as cloud synchronization through Supabase.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Chrome Extension (Manifest V3)

## Chrome Extension Installation

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` directory from this repository (or unzip `public/jobtrace-extension.zip`).
4. Pin the extension to your toolbar to capture job postings and confirmation pages while browsing.

## Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/SalmanLimbada/job-application-tracker.git
cd job-application-tracker
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Database Setup:

If using your own Supabase project, execute `supabase/schema.sql` in the Supabase SQL Editor to initialize the database schema and security policies.

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## License

MIT
