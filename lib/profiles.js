import Profile from '../models/Profile';
import { censorText, isCleanUsername } from './profanity';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const DISPLAY_NAME_MAX = 40;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const RESERVED = new Set([
  'admin', 'administrator', 'api', 'help', 'login', 'logout', 'me', 'mod', 'moderator', 'root',
  'settings', 'stats', 'support', 'system', 'trackkilo',
]);

// Returns an error message, or null if the username is valid (availability is checked separately)
export function validateUsername(username) {
  if (typeof username !== 'string') return 'Choose a username';
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Usernames are ${USERNAME_MIN}–${USERNAME_MAX} characters`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Use lowercase letters, numbers and underscores, starting with a letter';
  }
  if (RESERVED.has(username)) return 'That username is reserved';
  if (!isCleanUsername(username)) return 'That username isn’t allowed';
  return null;
}

// Display names are masked rather than rejected, so Google names always work
export function cleanDisplayName(name) {
  const trimmed = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, DISPLAY_NAME_MAX) : '';
  return censorText(trimmed);
}

// What other users may see
export const publicProfile = (profile) => ({
  username: profile.username,
  displayName: profile.displayName,
  image: profile.image || null,
});

const randomDigits = (count) => String(Math.floor(Math.random() * 10 ** count)).padStart(count, '0');

// "Alan Huynh" → "alanhuynh"; falls back to the email name, then "lifter"
function usernameBase(user) {
  const candidates = [user?.name, user?.email?.split('@')[0]];
  for (const candidate of candidates) {
    const base = (candidate || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .replace(/^[^a-z]+/, '')
      .slice(0, USERNAME_MAX - 5);
    if (base.length >= USERNAME_MIN && !validateUsername(base)) return base;
  }
  return 'lifter';
}

const isDuplicateKey = (error) => error?.code === 11000;

/**
 * The user's profile, created on first use with a username derived from their
 * Google name. Keeps the avatar in sync with the session.
 */
export async function getOrCreateProfile(session) {
  const { userId, user } = session;
  const existing = await Profile.findOne({ userId });
  if (existing) {
    if (user?.image && existing.image !== user.image) {
      existing.image = user.image;
      await existing.save();
    }
    return existing;
  }

  const base = usernameBase(user);
  const displayName = cleanDisplayName(user?.name).text || base;
  for (let attempt = 0; attempt < 8; attempt++) {
    const username = attempt === 0 ? base : `${base}${randomDigits(attempt < 4 ? 3 : 5)}`;
    try {
      return await Profile.create({ userId, username, displayName, image: user?.image });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      // Another request may have created this user's profile at the same time
      const raced = await Profile.findOne({ userId });
      if (raced) return raced;
    }
  }
  throw new Error('Could not create a unique username');
}
