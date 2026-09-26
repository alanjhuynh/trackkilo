import { useEffect, useState } from 'react';

// Per-device preferences. Storage can be unavailable (private mode, blocked
// site data), so every access falls back to a default.

const UNIT_KEY = 'trackkilo:unit';
const DISTANCE_KEY = 'trackkilo:distanceUnit';

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Not persisted; the default is used next time
  }
}

export const getPreferredUnit = () => (read(UNIT_KEY) === 'kg' ? 'kg' : 'lb');
export const setPreferredUnit = (unit) => write(UNIT_KEY, unit);

// Miles unless set otherwise, or unless weights are in kg
export function getPreferredDistanceUnit() {
  const saved = read(DISTANCE_KEY);
  if (saved === 'mi' || saved === 'km') return saved;
  return getPreferredUnit() === 'kg' ? 'km' : 'mi';
}
export const setPreferredDistanceUnit = (unit) => write(DISTANCE_KEY, unit);

// The preferred units, read after mount so server and client renders match
export function usePreferredUnits() {
  const [units, setUnits] = useState({ weight: 'lb', distance: 'mi' });
  useEffect(() => {
    setUnits({ weight: getPreferredUnit(), distance: getPreferredDistanceUnit() });
  }, []);
  return units;
}

export const usePreferredUnit = () => usePreferredUnits().weight;
