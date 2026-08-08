export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-ink pt-24 pb-20 px-5 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl lg:text-5xl text-paper mb-4">
          How Handova Works
        </h1>
        <p className="font-sans text-paper/55 text-lg mb-16 max-w-xl">
          A straightforward path from browsing to a signed, secured deal.
        </p>

        <section className="mb-14">
          <h2 className="font-serif text-2xl text-gold mb-5">Verification first</h2>
          <p className="font-sans text-paper/70 leading-relaxed">
            Every landlord and agent on Handova is verified before they can list.
            Companies verify with CAC registration, individual agents verify with
            NIN. You will always see a verification badge before you engage with
            a listing, so you know who you are actually dealing with.
          </p>
        </section>

        <section className="mb-14">
          <h2 className="font-serif text-2xl text-gold mb-5">The deal flow</h2>
          <ol className="space-y-6">
            {[
              { n: '01', t: 'Find a verified listing', d: 'Browse with filters, a verified-only toggle, or a saved search that alerts you when a match goes live.' },
              { n: '02', t: 'Connect directly', d: 'Message the landlord or agent through the platform, no back-channel required.' },
              { n: '03', t: 'Sign the tenancy agreement', d: 'Every deal includes a binding agreement before any money moves. No exceptions.' },
              { n: '04', t: 'Pay and move in', d: 'Payment is secured through the platform and released on confirmed move-in.' },
            ].map((step) => (
              <li key={step.n} className="flex gap-5">
                <span className="font-sans text-gold/50 text-sm tabular-nums pt-1">{step.n}</span>
                <div>
                  <h3 className="font-sans text-paper font-semibold mb-1">{step.t}</h3>
                  <p className="font-sans text-paper/55 text-sm leading-relaxed">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-14 pb-14 border-b border-paper/10">
          <h2 className="font-serif text-2xl text-gold mb-5">Vehicles, coming soon</h2>
          <p className="font-sans text-paper/70 leading-relaxed">
            Handova is extending the same verified, agreement-first approach to
            vehicle listings. Details on how that works will land here once it
            ships.
          </p>
        </section>

        <a
          href="/listings"
          className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-full bg-gold text-ink font-sans font-semibold hover:bg-gold-dark transition-colors"
        >
          Browse listings
        </a>
      </div>
    </div>
  );
}
