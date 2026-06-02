# Route Commerce - Production Setup Guide

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## Configuration

### 1. Clerk Authentication

1. Sign up at [Clerk](https://clerk.com)
2. Create a new application
3. Copy keys to `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   ```
4. Configure middleware in `src/proxy.ts`

### 2. Stripe Payments

1. Create Stripe account
2. Create products and prices in Stripe Dashboard
3. Update `.env.local` with:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

### 3. Supabase Database

1. Create project at [Supabase](https://supabase.com)
2. Run migrations: `npm run migrate`
3. Update `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx
   ```

### 4. Optional Services

#### Sentry (Error Monitoring)
```
SENTRY_DSN=https://xxx@sentry.io/xxx
```

#### PostHog (Analytics)
```
NEXT_PUBLIC_POSTHOG_API_KEY=phc_xxx
```

## Deployment

### Vercel

1. Connect repository to Vercel
2. Add all environment variables
3. Deploy

### Other Platforms

Ensure environment variables are set before deployment.

## Key Files

- `src/proxy.ts` - Clerk middleware
- `src/lib/stripe-billing.ts` - Stripe integration
- `src/lib/analytics.ts` - PostHog analytics
- `src/lib/sentry.ts` - Sentry error tracking
- `src/components/admin/AnalyticsDashboard.tsx` - Admin dashboard
- `src/components/onboarding/OnboardingFlow.tsx` - User onboarding
- `src/components/referral/ReferralSystem.tsx` - Referral tracking
- `src/components/changelog/ChangelogFeed.tsx` - Product updates
- `supabase/migrations/` - Database schema

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npm run migrate     # Run database migrations
```

## Documentation

- Full documentation: [CLAUDE.md](./CLAUDE.md)
- Launch checklist: [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)