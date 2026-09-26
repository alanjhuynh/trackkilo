import useSWR from 'swr';
import { PROFILE_KEY, fetcher } from './api';

// The signed-in user's public profile ({ username, displayName, image })
export default function useProfile() {
  const { data, error, isLoading, mutate } = useSWR(PROFILE_KEY, fetcher, { revalidateOnFocus: false });
  return { profile: data || null, error, isLoading, mutate };
}
