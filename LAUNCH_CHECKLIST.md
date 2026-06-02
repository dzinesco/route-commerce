# LAUNCH CHECKLIST - Route Commerce

## Pre-Launch Verification

### Environment Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add all required API keys:
  - [ ] Clerk publishable key
  - [ ] Stripe secret key and price IDs
  - [ ] Supabase URL and keys
  - [ ] Sentry DSN (for error monitoring)
  - [ ] PostHog API key (for analytics)

### Database Setup
- [ ] Run all migrations: `npm run migrate`
- [ ] Verify RLS policies are enforced
- [ ] Seed demo data if needed: `supabase db seed`

### Clerk Authentication
1. Create account at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create new application (choose "Application" type)
3. Copy Publishable Key to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Copy Secret Key to `CLERK_SECRET_KEY`
5. Set up webhooks for user sync
6. Configure redirect URLs:
   - `http://localhost:3000/login` (or your domain in production)
   - `http://localhost:3000/register`
   - `http://localhost:3000/sso-callback`

### Stripe Configuration
1. Create account at [dashboard.stripe.com](https://dashboard.stripe.com)
2. Create products and prices for each plan:
   - [ ] Starter (Monthly/Annual)
   - [ ] Farm (Monthly/Annual)
   - [ ] Enterprise
3. Configure webhooks:
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Events: checkout.session.completed, customer.subscription.*, invoice.*
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Feature Flags
- [ ] Verify all feature flags in `brand_features` table
- [ ] Test feature toggling in admin settings

## Production Deployment

### Vercel / Hosting Setup
- [ ] Connect repository to hosting
- [ ] Configure environment variables
- [ ] Set `NEXT_PUBLIC_USE_MOCK_DATA=false`
- [ ] Enable Edge Functions if needed

### Domain & SSL
- [ ] Configure custom domain
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Set `NEXT_PUBLIC_SITE_URL` to production URL

### Email (Resend)
- [ ] Create Resend account
- [ ] Add domain for sending
- [ ] Create API key
- [ ] Test email delivery

### PWA Setup
- [ ] Generate app icons (see `/public/icons/`)
- [ ] Test service worker registration
- [ ] Test "Add to Home Screen" prompt
- [ ] Test push notifications (if configured)

## Post-Launch Verification

### Authentication
- [ ] Test sign up flow
- [ ] Test sign in flow
- [ ] Test password reset
- [ ] Test sign out
- [ ] Verify role-based access

### Core Features
- [ ] Test product CRUD operations
- [ ] Test stop/route creation
- [ ] Test order creation
- [ ] Test checkout flow
- [ ] Test email campaigns

### Billing
- [ ] Test subscription creation
- [ ] Test plan upgrades
- [ ] Test plan cancellations
- [ ] Verify webhook handling
- [ ] Test customer portal access

### Monitoring
- [ ] Verify Sentry is receiving errors
- [ ] Verify PostHog is tracking events
- [ ] Check error logs for any issues

## Launch Day

### Final Checks
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Run lint: `npm run lint`
- [ ] Test on mobile devices
- [ ] Test on different browsers
- [ ] Verify all API routes work

### Documentation
- [ ] Update support email addresses
- [ ] Prepare onboarding documentation
- [ ] Prepare FAQ for customers

## Environment Variables Reference

```bash
# ===========================================
# CLERK AUTHENTICATION
# ===========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# ===========================================
# STRIPE PAYMENTS
# ===========================================
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_FARM_MONTHLY=price_xxx
STRIPE_PRICE_FARM_ANNUAL=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx

# ===========================================
# SUPABASE
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# ===========================================
# OPTIONAL: SENTRY
# ===========================================
SENTRY_DSN=https://xxx@sentry.io/xxx

# ===========================================
# OPTIONAL: POSTHOG
# ===========================================
NEXT_PUBLIC_POSTHOG_API_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Troubleshooting

### Auth Issues
- Check Clerk dashboard for sign-in logs
- Verify redirect URLs are configured
- Check browser console for errors

### Payment Issues
- Check Stripe dashboard for failed payments
- Verify webhook is receiving events
- Check server logs for webhook errors

### Database Issues
- Check Supabase dashboard for connection issues
- Verify RLS policies allow required operations
- Check for migration errors

## Resources

- Clerk Dashboard: https://dashboard.clerk.com
- Stripe Dashboard: https://dashboard.stripe.com
- Supabase Dashboard: https://supabase.com/dashboard
- Sentry Dashboard: https://sentry.io
- PostHog: https://app.posthog.com