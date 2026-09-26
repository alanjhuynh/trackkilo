import { useRef } from 'react';

// The most recent non-null value, so a closing modal keeps its content while it fades out
export default function useLatest(value) {
  const latest = useRef(value);
  if (value !== null && value !== undefined) latest.current = value;
  return latest.current;
}
