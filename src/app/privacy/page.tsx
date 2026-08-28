import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Frost Levelz",
  description: "How Frost Levelz handles your personal data.",
};

const UPDATED = "28 August 2026";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16">
      <h1 className="frost-heading text-2xl font-bold mb-2 uppercase tracking-wide">
        Privacy Policy
      </h1>
      <p className="text-foreground/40 text-xs mb-10">Last updated {UPDATED}</p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/70">
        <section>
          <h2 className="text-foreground font-semibold mb-2">Who we are</h2>
          <p>
            This site is operated by Frost Levelz, trading as Frost Level Investment
            Group, a sole trader based in the United Kingdom. We are the data
            controller for the personal information described here.
          </p>
          <p className="mt-2">
            Contact:{" "}
            <a
              href="mailto:Frostlevelmanagement@gmail.com"
              className="text-accent hover:underline"
            >
              Frostlevelmanagement@gmail.com
            </a>
            . A postal address is available on request by email.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">What we collect</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <strong className="text-foreground/90">Your email address</strong> — when
              you buy something, create an account, or subscribe.
            </li>
            <li>
              <strong className="text-foreground/90">Purchase records</strong> — what you
              bought, when, the amount paid, and a payment reference, together with how
              many times you have downloaded it.
            </li>
            <li>
              <strong className="text-foreground/90">Account and subscription
              details</strong> — your sign-in history and, if you subscribe, your
              subscription status and renewal date.
            </li>
            <li>
              <strong className="text-foreground/90">Comments</strong> — the name and
              message you post. These are public on the site, so please don&apos;t include
              anything private.
            </li>
            <li>
              <strong className="text-foreground/90">A one-way hash of your IP
              address</strong> — used only to limit how often comments can be posted.
              We do not store your actual IP address, and the hash cannot be reversed
              to identify you.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">What we don&apos;t collect</h2>
          <p>
            We never see or store your card details — payments are handled entirely by
            Stripe. We do not use analytics, advertising, tracking pixels or third-party
            cookies, and we do not profile you or make automated decisions about you.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Cookies</h2>
          <p>We use two cookies, both strictly necessary:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
            <li>
              <strong className="text-foreground/90">Session cookie</strong> — keeps you
              signed in for up to 90 days. Without it you could not stay logged in.
            </li>
            <li>
              <strong className="text-foreground/90">Sign-in security cookie</strong> — a
              short-lived value (10 minutes) used only during Google sign-in to verify
              the request genuinely came from you.
            </li>
          </ul>
          <p className="mt-2">
            Neither is used for tracking or advertising, which is why you aren&apos;t asked
            to accept cookies.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Why we use your data</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <strong className="text-foreground/90">To fulfil your order</strong> —
              delivering your music, sending your confirmation, and providing your
              subscription. This is necessary to perform our contract with you.
            </li>
            <li>
              <strong className="text-foreground/90">To keep the site working and
              safe</strong> — preventing spam and abuse, and enforcing download limits.
              This is our legitimate interest in protecting the site and the artist&apos;s
              work.
            </li>
            <li>
              <strong className="text-foreground/90">To meet legal obligations</strong> —
              keeping records of sales for tax and accounting purposes.
            </li>
          </ul>
          <p className="mt-2">
            We do not send marketing email. If we ever do, it will be with your explicit
            consent and every message will let you unsubscribe.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Who else handles your data</h2>
          <p>We use these providers, and only for the purposes described:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
            <li>
              <strong className="text-foreground/90">Stripe</strong> — payments and
              subscription billing.
            </li>
            <li>
              <strong className="text-foreground/90">Convex</strong> — our database and
              file storage, hosted in the United States.
            </li>
            <li>
              <strong className="text-foreground/90">Resend</strong> — sending
              confirmation and sign-in emails, processed in Ireland.
            </li>
            <li>
              <strong className="text-foreground/90">Hostinger</strong> — the server the
              website runs on.
            </li>
            <li>
              <strong className="text-foreground/90">Google</strong> — only if you choose
              to sign in with Google, in which case Google confirms your email address to
              us. We receive nothing else.
            </li>
          </ul>
          <p className="mt-2">
            Because our database is hosted in the United States, your data is transferred
            outside the UK. That transfer relies on the safeguards in our providers&apos;
            data processing terms. We do not sell your data or share it for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">How long we keep it</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Sign-in links expire after 15 minutes and can only be used once.</li>
            <li>Sessions expire after 90 days, or immediately when you sign out.</li>
            <li>
              Sales records are kept for six years, as UK tax rules require.
            </li>
            <li>
              Account details are kept until you ask us to delete them. Comments stay
              until removed by you or by us.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Your rights</h2>
          <p>
            You have the right to ask for a copy of your data, to have it corrected or
            erased, to restrict or object to how we use it, and to receive it in a
            portable format. Email us and we will respond within one month.
          </p>
          <p className="mt-2">
            Note that we may need to keep sales records even after deleting your account,
            because tax law requires it.
          </p>
          <p className="mt-2">
            If you are unhappy with how we have handled your data, you can complain to the
            Information Commissioner&apos;s Office at{" "}
            <a
              href="https://ico.org.uk"
              className="text-accent hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              ico.org.uk
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Children</h2>
          <p>
            This site is not aimed at children under 13, and we do not knowingly collect
            their data. If you believe a child has given us personal information, please
            contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Changes</h2>
          <p>
            If we change this policy we will update the date at the top of this page.
          </p>
        </section>
      </div>

      <a href="/" className="inline-block mt-12 text-accent hover:underline text-sm">
        &larr; Back to Store
      </a>
    </div>
  );
}
