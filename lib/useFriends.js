import useSWR from 'swr';
import { FRIENDS_KEY, fetcher } from './api';

const EMPTY = { friends: [], incoming: [], outgoing: [] };

// Friends and pending requests. Refetched on focus so new requests show up.
export default function useFriends() {
  const { data, error, isLoading, mutate } = useSWR(FRIENDS_KEY, fetcher);
  return { ...(data || EMPTY), error, isLoading, mutate };
}
