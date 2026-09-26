// Set helpers shared by the API and the client.

export const MAX_SETS = 100;
export const METRICS = ['lb', 'kg'];

const LB_PER_KG = 2.20462262;

// Weight in kg, so sets logged in different units can be compared
export const toKg = ({ weight, metric }) => (metric === 'kg' ? weight : weight / LB_PER_KG) || 0;

// Heaviest set, preferring more reps when weights tie
export function topSet(sets = []) {
  return sets.reduce((best, set) => {
    if (!best) return set;
    const diff = toKg(set) - toKg(best);
    return diff > 0 || (diff === 0 && set.rep > best.rep) ? set : best;
  }, null);
}
