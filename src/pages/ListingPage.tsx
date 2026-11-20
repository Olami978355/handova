import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ListingWizard } from '../components/listing/ListingWizard';

export const ListingPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <header className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 lg:py-10">
          <Link
            to="/listings"
            className="mb-10 inline-flex items-center gap-2 text-xs font-medium text-paper/45 transition-colors hover:text-gold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to properties
          </Link>

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
                Property management · Handova
              </p>

              <h1 className="font-serif text-4xl font-medium leading-[1.08] tracking-tight text-paper sm:text-5xl lg:text-6xl">
                Bring your property
                <br />
                <span className="italic text-gold">to the market.</span>
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-7 text-paper/50 sm:text-base">
                Create a property listing and connect with people looking for
                their next home or investment across Nigeria.
              </p>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold/20 text-gold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-paper/85">
                  Your listing, your control
                </p>
                <p className="mt-1 text-[11px] text-paper/40">
                  Review your details before publishing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <ListingWizard />
      </section>
    </main>
  );
};
