// Per-device preferences. Storage can be unavailable (private mode, blocked
// site data), so every access falls back to a default.

const UNIT_KEY = 'trackkilo:unit';

export function getPreferredUnit() {
  try {
    return window.localStorage.getItem(UNIT_KEY) === 'kg' ? 'kg' : 'lb';
  } catch (error) {
    return 'lb';
  }
}

export function setPreferredUnit(unit) {
  try {
    window.localStorage.setItem(UNIT_KEY, unit);
  } catch (error) {
    // Not persisted; the default is used next time
  }
}
