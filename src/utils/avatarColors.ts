// Deterministic color assignment for team members based on name/initials
// Ensures exact same color appears consistently across Leads, Dashboard, Leaderboard, etc.

const COLOR_PALETTE = [
  { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', hex: '#059669' },
  { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', hex: '#2563eb' },
  { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700', hex: '#9333ea' },
  { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-700', hex: '#d97706' },
  { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-700', hex: '#e11d48' },
  { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-700', hex: '#0d9488' },
  { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700', hex: '#4f46e5' },
  { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-700', hex: '#0891b2' },
  { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-700', hex: '#ea580c' },
  { bg: 'bg-pink-600', text: 'text-white', border: 'border-pink-700', hex: '#db2777' }
];

export function getInitials(name: string): string {
  if (!name) return 'DP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(name: string): { bg: string; text: string; border: string; hex: string } {
  if (!name) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}
