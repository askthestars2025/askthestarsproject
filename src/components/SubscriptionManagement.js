// components/SubscriptionManagement.js
import { useMemo, useState } from 'react';

/**
 * Props
 * - user: { uid, email, ... }
 * - userData: {
 *     plan: 'weekly' | 'annual' | null,
 *     subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null,
 *     subscriptionDate: ISOString,
 *     currentPeriodEnd: ISOString | unixSeconds (optional),
 *     invoices: [{ id, amount, currency, created, hosted_invoice_url, status }] (optional)
 *   }
 * - onBack: () => void
 */
export default function SubscriptionManagement({ user, userData, onBack }) {
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // 'weekly' | 'annual' | null
  const [showCancelModal, setShowCancelModal] = useState(false);

  const planConfig = useMemo(
    () => ({
      weekly: {
        key: 'weekly',
        name: 'Weekly Cosmic Access',
        priceLabel: '$4.99',
        intervalLabel: 'week',
        blurb: 'Try everything with a small weekly commitment.',
        features: [
          'Unlimited cosmic consultations',
          'Advanced soulmate matching',
          'Priority dream interpretation',
          'Daily personalized horoscopes',
          'Romantic compatibility analysis',
          'Weekly cosmic forecast',
        ],
        cta: 'Continue Weekly',
      },
      annual: {
        key: 'annual',
        name: 'Annual Stellar Membership',
        priceLabel: '$49.99',
        intervalLabel: 'year',
        blurb: 'Best value for dedicated stargazers.',
        features: [
          'Unlimited cosmic consultations',
          'Advanced soulmate matching',
          'Priority dream interpretation',
          'Daily personalized horoscopes',
          'Complete compatibility analysis',
          'Yearly destiny mapping',
          'VIP customer support',
        ],
        cta: 'Continue Annual',
        recommended: true,
      },
    }),
    []
  );

  const hasActiveSubscription =
    userData?.subscriptionStatus === 'active' ||
    userData?.subscriptionStatus === 'trialing' ||
    userData?.plan === 'annual' ||
    userData?.plan === 'weekly';

  const currentPlan = userData?.plan && planConfig[userData.plan];

  const formatDate = (dateLike) => {
    if (!dateLike) return '';
    const d =
      typeof dateLike === 'number'
        ? new Date(dateLike * 1000)
        : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const computedRenewal = (() => {
    if (userData?.currentPeriodEnd) return formatDate(userData.currentPeriodEnd);
    if (userData?.subscriptionDate && userData?.plan) {
      const base = new Date(userData.subscriptionDate);
      if (Number.isNaN(base.getTime())) return '';
      const copy = new Date(base);
      copy.setDate(
        base.getDate() + (userData.plan === 'weekly' ? 7 : 365)
      );
      return formatDate(copy);
    }
    return '';
  })();

  const statusPill = (() => {
    const s = userData?.subscriptionStatus;
    const map = {
      active: { label: 'Active', classes: 'bg-green-500/15 text-green-400 border-green-500/30' },
      trialing: { label: 'Trialing', classes: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
      past_due: { label: 'Past Due', classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
      canceled: { label: 'Canceled', classes: 'bg-gray-500/15 text-gray-300 border-gray-600/30' },
      incomplete: { label: 'Incomplete', classes: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    };
    return map[s] || { label: 'Free', classes: 'bg-gray-500/15 text-gray-300 border-gray-600/30' };
  })();

  const openBillingPortal = async () => {
    try {
      setIsPortalLoading(true);
      // Implement this API route to create a Stripe Billing Portal session
      // and respond with { url }
      const r = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.uid }),
      });
      const data = await r.json();
      if (r.ok && data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || 'Unable to open billing portal');
      }
    } catch (e) {
      console.error('Portal error:', e);
      alert('Could not open the billing portal. Please try again or contact support.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleCheckout = async (plan) => {
    try {
      setCheckoutLoading(plan);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: user?.uid,
          email: user?.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || 'Unable to start checkout');
      }
    } catch (e) {
      console.error('Checkout error:', e);
      alert('Could not start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const confirmCancel = async () => {
    try {
      setIsCancelLoading(true);
      // Option A (recommended): Cancel in Stripe via your API route then update your DB.
      // const r = await fetch('/api/subscription/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.uid })});
      // const data = await r.json();
      // if (!r.ok) throw new Error(data?.error || 'Cancel failed');

      // Option B (safe placeholder): Ask user to use billing portal or contact support
      alert(
        "To cancel or pause your subscription, please use 'Manage billing' (opens Stripe portal) or email support@askthestars.com."
      );
      setShowCancelModal(false);
    } catch (e) {
      console.error('Cancel error:', e);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white relative overflow-hidden">
      {/* Ambient Lighting */}
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] bg-gradient-radial from-orange-500/10 via-red-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-radial from-red-500/10 via-orange-500/10 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 safe-area-top relative z-20 backdrop-blur supports-[backdrop-filter]:bg-white/2.5">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Subscription</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 max-w-3xl mx-auto relative z-10 space-y-6">
        {/* Status Banner */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse" />
            <div className="text-sm text-gray-300">
              Signed in as{' '}
              <span className="text-white font-medium">{user?.email || 'anonymous'}</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center border text-xs font-semibold px-2.5 py-1 rounded-full ${statusPill.classes}`}
          >
            {statusPill.label}
          </span>
        </div>

        {hasActiveSubscription && currentPlan ? (
          <>
            {/* Current Plan */}
            <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-gray-900/70 via-black/80 to-gray-900/70 shadow-lg shadow-emerald-500/10 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                      {currentPlan.name}
                    </span>
                  </h2>
                  <p className="text-gray-400 mt-1">
                    {currentPlan.priceLabel}/{currentPlan.intervalLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openBillingPortal}
                    disabled={isPortalLoading}
                    className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"
                  >
                    {isPortalLoading ? (
                      <Spinner className="mr-2" />
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h13M8 8h13M8 12h13M8 16h13M3 4h.01M3 8h.01M3 12h.01M3 16h.01" />
                      </svg>
                    )}
                    Manage billing
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="inline-flex items-center rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-all px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-5">
                <InfoRow label="Status" value={statusPill.label} />
                {userData?.subscriptionDate && (
                  <InfoRow label="Started" value={formatDate(userData.subscriptionDate)} />
                )}
                {computedRenewal && <InfoRow label="Renews" value={computedRenewal} />}
              </div>

              {/* Features */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Included features</h3>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {currentPlan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Change Plan (upsell/cross-sell) */}
            <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Change plan</h3>
                <p className="text-xs text-gray-400">
                  Switch plans anytime. Changes take effect immediately.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {Object.values(planConfig).map((p) => {
                  const isCurrent = userData?.plan === p.key;
                  return (
                    <PlanCard
                      key={p.key}
                      plan={p}
                      isCurrent={isCurrent}
                      onSelect={() => handleCheckout(p.key)}
                      loading={checkoutLoading === p.key}
                    />
                  );
                })}
              </div>
            </section>

            {/* Invoices (if provided) */}
            <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Billing history</h3>
                <button
                  onClick={openBillingPortal}
                  className="text-sm text-orange-300 hover:text-orange-200 underline underline-offset-4"
                >
                  View all in portal
                </button>
              </div>

              {Array.isArray(userData?.invoices) && userData.invoices.length > 0 ? (
                <ul className="divide-y divide-white/10">
                  {userData.invoices.slice(0, 6).map((inv) => (
                    <li key={inv.id} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm text-gray-300">
                          {formatDate(inv.created)} •{' '}
                          <span className="uppercase">{inv.currency || 'usd'}</span>{' '}
                          {(inv.amount / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">Status: {inv.status}</div>
                      </div>
                      {inv.hosted_invoice_url && (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-white/90 hover:text-white underline underline-offset-4"
                        >
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-400">No invoices yet.</div>
              )}
            </section>
          </>
        ) : (
          // No subscription — Plan chooser
          <section className="space-y-5">
            <div className="text-center max-w-2xl mx-auto">
              <div className="w-14 h-14 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0h-2m8-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Unlock Premium</h2>
              <p className="text-gray-400 mt-1">
                You’re on the free tier. Choose a plan to activate all cosmic features.
              </p>
              {userData?.subscriptionStatus === 'canceled' && (
                <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 px-3 py-2 text-sm">
                  Your previous subscription was cancelled. You can resubscribe anytime.
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {Object.values(planConfig).map((p) => (
                <PlanCard
                  key={p.key}
                  plan={p}
                  onSelect={() => handleCheckout(p.key)}
                  loading={checkoutLoading === p.key}
                />
              ))}
            </div>

            <p className="text-center text-xs text-gray-500">
              You can manage or cancel anytime from the Stripe billing portal.
            </p>
          </section>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-black/80 to-gray-950/90 p-5">
            <h3 id="cancel-title" className="text-lg font-semibold">
              Cancel subscription?
            </h3>
            <p className="text-sm text-gray-400 mt-2">
              You can also pause or manage your plan from the Stripe billing portal.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
              >
                Keep plan
              </button>
              <button
                onClick={confirmCancel}
                disabled={isCancelLoading}
                className="px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-70"
              >
                {isCancelLoading ? 'Working…' : 'Cancel plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Utilities */}
      <style jsx>{`
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

function Spinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 text-white ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"
      ></path>
    </svg>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm font-medium">{value || '—'}</div>
    </div>
  );
}

function PlanCard({ plan, isCurrent = false, onSelect, loading = false }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        plan.recommended
          ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5 shadow-lg shadow-orange-500/10'
          : 'border-white/10 bg-white/5'
      }`}
      role="region"
      aria-label={`${plan.name} plan`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold">{plan.name}</h4>
            {plan.recommended && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 font-semibold tracking-wide">
                Best value
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{plan.blurb}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{plan.priceLabel}</div>
          <div className="text-xs text-gray-400">per {plan.intervalLabel}</div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {plan.features.slice(0, 4).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <svg className="w-4 h-4 mt-0.5 text-orange-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {isCurrent ? (
          <button
            className="w-full inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 font-semibold px-4 py-2.5 cursor-default"
            aria-disabled="true"
          >
            Current plan
          </button>
        ) : (
          <button
            onClick={onSelect}
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-semibold px-4 py-2.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"
          >
            {loading && <Spinner className="mr-2" />}
            {plan.cta}
          </button>
        )}
      </div>
    </div>
  );
}
