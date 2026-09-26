/*
 * Profanity filter for text other people can see: lift names, notes, display
 * names and usernames.
 *
 * Text is split into words, common substitutions are undone ("sh1t", "@ss") and
 * stretched letters are allowed ("fuuuck"). STRONG words are caught anywhere,
 * including inside longer words ("bullshit"). WEAK words only match a whole
 * word, because they also appear inside ordinary words ("assisted", "cocktail",
 * "title", "spicy").
 *
 * Exercise names that sound rude but aren't (Snatch, Clean and Jerk, Sissy
 * Squat) are deliberately not listed.
 */

const STRONG = [
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'asshole', 'arsehole', 'dickhead', 'cocksucker',
  'whore', 'slut', 'twat', 'wanker', 'jizz', 'dildo', 'goddamn', 'dumbass', 'jackass', 'fatass',
  'asswipe', 'smartass', 'douchebag', 'bollocks', 'retard', 'nigger', 'nigga', 'faggot', 'kike',
  'wetback', 'towelhead', 'raghead',
];

const WEAK = [
  'ass', 'asses', 'arse', 'dick', 'dicks', 'cock', 'cocks', 'cum', 'tit', 'tits', 'titty', 'titties',
  'pussy', 'pussies', 'piss', 'pissed', 'pissing', 'crap', 'crappy', 'damn', 'damned', 'prick',
  'pricks', 'douche', 'skank', 'porn', 'porno', 'rape', 'raped', 'raping', 'rapist', 'nazi', 'nazis',
  'fag', 'fags', 'spic', 'spics', 'chink', 'chinks', 'gook', 'gooks', 'tranny', 'trannies', 'dyke',
  'dykes', 'coon', 'coons', 'beaner', 'beaners', 'paki', 'pakis',
];

// Ordinary words that contain a strong word
const ALLOWED = new Set([
  'shiitake', 'shiitakes', 'shitake', 'mishit', 'mishits', 'scunthorpe', 'retardant', 'retardants',
]);

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };

// "ass" → "a+s+s+": stretched letters match, but "as" doesn't
const pattern = (word) => word.split('').map((letter) => `${letter}+`).join('');
const STRONG_RE = new RegExp(STRONG.map(pattern).join('|'));
const WEAK_RE = new RegExp(`^(?:${WEAK.map(pattern).join('|')})$`);

const HAS_LETTER = /\p{L}/u;
const WORD = /[\p{L}\p{N}@$!|]+/gu;
const EDGE_SYMBOLS = /^[@$!|]+|[@$!|]+$/g;

// Lowercase, strip accents and undo substitutions. Runs without letters (like
// "455") are left alone so weights never read as words.
function normalize(word) {
  if (!HAS_LETTER.test(word)) return '';
  return word
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // accents
    .toLowerCase()
    .replace(/[0134578@$!|]/g, (char) => LEET[char]);
}

const isBad = (word) => {
  const normalized = normalize(word);
  return Boolean(normalized) && !ALLOWED.has(normalized)
    && (STRONG_RE.test(normalized) || WEAK_RE.test(normalized));
};

const mask = (word) => word[0] + '*'.repeat(word.length - 1);

/**
 * Replaces bad words with the first letter plus asterisks ("s***").
 * Returns `{ text, censored }`.
 */
export function censorText(text) {
  if (typeof text !== 'string' || !text) return { text, censored: false };

  let censored = false;
  const result = text.replace(WORD, (word) => {
    // Try without surrounding symbols first, so "ass!" keeps its "!"
    const core = word.replace(EDGE_SYMBOLS, '');
    if (core && isBad(core)) {
      censored = true;
      return word.replace(core, mask(core));
    }
    if (isBad(word)) {
      censored = true;
      return mask(word);
    }
    return word;
  });

  return { text: result, censored };
}

// Usernames are one word ("big_lifter"), so strong words are checked across the
// whole name and weak words against each underscore/number-separated part
export function isCleanUsername(username) {
  const runs = username.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(normalize);
  const compact = runs.join('').replace(/[^a-z]/g, '');
  const parts = runs.flatMap((run) => run.split(/[^a-z]+/)).filter(Boolean);
  return !STRONG_RE.test(compact) && !WEAK_RE.test(compact) && !parts.some((part) => WEAK_RE.test(part));
}
