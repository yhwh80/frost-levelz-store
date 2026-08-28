import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Frost Levelz",
  description: "Terms for buying music and subscribing at frostlevelz.com.",
};

const UPDATED = "28 August 2026";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-16">
      <h1 className="frost-heading text-2xl font-bold mb-2 uppercase tracking-wide">
        Terms of Service
      </h1>
      <p className="text-foreground/40 text-xs mb-10">Last updated {UPDATED}</p>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/70">
        <section>
          <h2 className="text-foreground font-semibold mb-2">Who we are</h2>
          <p>
            frostlevelz.com is operated by Frost Levelz, trading as Frost Level Investment
            Group, a sole trader based in the United Kingdom. By buying from or
            subscribing to this site you agree to these terms.
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
          <h2 className="text-foreground font-semibold mb-2">Prices and payment</h2>
          <p>
            All prices are in pounds sterling and include any tax due. Payment is handled
            by Stripe; we never see your card details. Your order is confirmed once
            payment succeeds and we email you.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Buying music</h2>
          <p>
            When you buy a track or album you get a download in MP3 format. Your download
            link works for <strong className="text-foreground/90">up to 5 downloads
            within 30 days</strong> of purchase. Albums are delivered as a single zip
            file containing every track.
          </p>
          <p className="mt-2">
            Download the files and keep your own copy. If your link expires or runs out
            before you&apos;ve saved your music, email us and we&apos;ll sort it out.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">
            Your right to cancel, and why downloads are different
          </h2>
          <p>
            You normally have 14 days to cancel an online purchase. Digital downloads are
            an exception: by starting your download you agree to receive the content
            immediately and acknowledge that you lose your right to cancel once the
            download begins.
          </p>
          <p className="mt-2">
            If you haven&apos;t downloaded anything yet, contact us within 14 days and we
            will refund you in full. If something is faulty or doesn&apos;t work, tell us
            and we&apos;ll fix it or refund you — this doesn&apos;t affect your legal rights.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Subscription</h2>
          <p>
            Full Access costs <strong className="text-foreground/90">£2.99 per
            month</strong> and lets you stream every released track in full on this site.
            It renews automatically each month until you cancel.
          </p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-1.5">
            <li>
              <strong className="text-foreground/90">Streaming only.</strong> A
              subscription lets you listen; it does not include downloads and does not
              give you ownership of any recording. Buying a track separately is how you
              get a file to keep.
            </li>
            <li>
              <strong className="text-foreground/90">Cancel any time</strong> from your
              account page. Your access continues until the end of the month you have
              already paid for, and you will not be charged again.
            </li>
            <li>
              We don&apos;t refund part-months, but if you cancel you keep what you paid
              for until that period ends.
            </li>
            <li>
              The catalogue may change over time as releases are added. We aim to include
              new releases, but we can&apos;t guarantee that every recording will remain
              available indefinitely.
            </li>
            <li>
              If a payment fails we may retry it. If it keeps failing, your access will
              stop.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">How you may use the music</h2>
          <p>
            Music bought or streamed here is for your own personal, non-commercial use.
            You may not redistribute it, upload it elsewhere, share your download links or
            account, or use it in any commercial context — including video, broadcast or
            public performance — without written permission.
          </p>
          <p className="mt-2">
            All recordings, artwork and other content remain the property of Frost Levelz
            and Frost Level Investment Group. For licensing enquiries, email us.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Your account</h2>
          <p>
            You sign in with your email address or a Google account. Keep access to your
            inbox secure, since anyone who can read your email could sign in as you. Tell
            us straight away if you think someone else has got into your account.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Comments</h2>
          <p>
            Comments are public. Please keep them civil — no abuse, harassment, hate
            speech, spam, links or impersonating anyone. We may remove any comment or
            block anyone from posting, at our discretion and without notice. You are
            responsible for what you post.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Availability</h2>
          <p>
            We do our best to keep the site running, but we can&apos;t promise it will
            always be available or uninterrupted. We may need to suspend it for
            maintenance or for reasons beyond our control.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Liability</h2>
          <p>
            Nothing in these terms limits our liability for death or personal injury
            caused by negligence, for fraud, or for anything else that cannot legally be
            limited — including your rights under the Consumer Rights Act 2015.
          </p>
          <p className="mt-2">
            Otherwise, our liability to you is limited to the amount you have paid us in
            the twelve months before the issue arose, and we are not liable for indirect
            or consequential loss.
          </p>
        </section>

        <section>
          <h2 className="text-foreground font-semibold mb-2">Changes and governing law</h2>
          <p>
            We may update these terms; the date at the top shows when they last changed.
            Changes won&apos;t affect an order you have already placed. If we change the
            subscription price we will tell you in advance and you can cancel before it
            applies.
          </p>
          <p className="mt-2">
            These terms are governed by the law of England and Wales, and disputes fall to
            the courts of England and Wales.
          </p>
        </section>
      </div>

      <a href="/" className="inline-block mt-12 text-accent hover:underline text-sm">
        &larr; Back to Store
      </a>
    </div>
  );
}
