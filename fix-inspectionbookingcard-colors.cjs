const fs = require('fs');
const path = 'src/components/inspection/InspectionBookingCard.tsx';
const raw = fs.readFileSync(path, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r\n|\n/);

const idx = lines.findIndex(l => l.includes("pending_payment:      { label: 'Pending Payment'"));
if (idx === -1) throw new Error('statusConfig anchor not found.');

// Replace the full 10-line map with palette-correct values.
lines.splice(idx, 10,
  `    pending_payment:      { label: 'Pending Payment',      color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },`,
  `    payment_confirmed:    { label: 'Payment Confirmed',    color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },`,
  `    inspection_scheduled: { label: 'Inspection Scheduled', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },`,
  `    inspection_done:      { label: 'Inspection Done',      color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },`,
  `    tenant_interested:    { label: 'Interested',           color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },`,
  `    tenant_declined:      { label: 'Declined',             color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },`,
  `    escrow_started:       { label: 'Escrow Started',       color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },`,
  `    refunded:             { label: 'Refunded',             color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },`,
  `    dispute_raised:       { label: 'Dispute Raised',       color: '#E5484D', bg: 'rgba(229,72,77,0.1)' },`,
  `    dispute_resolved:     { label: 'Dispute Resolved',     color: '#D4AF37', bg: 'rgba(212,175,55,0.1)' },`
);

fs.writeFileSync(path, lines.join(eol), 'utf8');
console.log('InspectionBookingCard.tsx: status colors remapped to gold/gray/danger palette.');
