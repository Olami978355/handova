import { X, Home } from 'lucide-react';
import { Property } from '../types';
import { formatNaira } from '../utils/format';

interface CompareModalProps {
  properties: Property[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

const periodLabel: Record<string, string> = {
  yearly: '/yr', monthly: '/mo', nightly: '/night', outright: ''
};

export function CompareModal({ properties, onClose, onRemove }: CompareModalProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-ink/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-paper">Compare properties</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-paper/50 hover:text-paper transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {properties.length === 0 ? (
          <div className="bg-slate/25 border border-white/6 rounded-2xl p-14 text-center">
            <Home className="w-10 h-10 text-paper/15 mx-auto mb-4" />
            <p className="font-sans text-paper/50">No properties selected to compare.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${properties.length}, minmax(220px, 1fr))` }}>
              {properties.map(p => (
                <div key={p.id} className="bg-slate/25 border border-white/6 rounded-2xl overflow-hidden">
                  <div className="relative h-32 bg-ink">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-8 h-8 text-paper/10" />
                      </div>
                    )}
                    <button
                      onClick={() => onRemove(p.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-ink/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-paper/60 hover:text-paper transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-sans text-[13px] font-semibold text-paper line-clamp-1 mb-3">{p.title}</h3>

                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-paper/35 mb-0.5">Price</p>
                        <p className="text-[15px] font-black text-gold tabular-nums">
                          {formatNaira(p.price)}
                          {p.price_period && <span className="text-[10px] text-paper/35 ml-1">{periodLabel[p.price_period]}</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-paper/35 mb-0.5">Location</p>
                        <p className="text-[12px] text-paper/70">{p.lga}, {p.state}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-paper/35 mb-0.5">Type</p>
                        <p className="text-[12px] text-paper/70 capitalize">{p.listing_type} &middot; {p.transaction_type === 'rent' ? 'For Rent' : 'For Sale'}</p>
                      </div>
                      {p.listing_type === 'house' ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-paper/35 mb-0.5">Bed / Bath</p>
                          <p className="text-[12px] text-paper/70">{p.bedrooms || '-'} bed &middot; {p.bathrooms || '-'} bath</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-paper/35 mb-0.5">Land size</p>
                          <p className="text-[12px] text-paper/70">{p.land_size_value ? `${p.land_size_value} ${p.land_size_unit}` : '-'}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-paper/35 mb-0.5">Verified</p>
                        <p className="text-[12px] text-paper/70">{p.escrow_verified ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <a
                      href={`/property/${p.id}`}
                      className="mt-4 flex items-center justify-center w-full py-2.5 bg-gold text-ink rounded-xl text-[12px] font-bold hover:bg-gold-dark transition-colors"
                    >
                      View listing
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
