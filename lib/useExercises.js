import { useMemo } from 'react';
import useSWR from 'swr';
import { EXERCISES_KEY, fetcher } from './api';
import { normalizeName } from './format';

const EMPTY = [];

// The user's exercise history (see /api/exercises), indexed for lookups
export default function useExercises() {
  const { data, error, isLoading } = useSWR(EXERCISES_KEY, fetcher, { revalidateOnFocus: false });

  return useMemo(() => {
    const exercises = data?.exercises || EMPTY;
    return {
      exercises,
      byName: new Map(exercises.map((exercise) => [normalizeName(exercise.name), exercise])),
      prLiftIds: new Set(data?.prLiftIds || EMPTY),
      isLoading,
      error,
    };
  }, [data, error, isLoading]);
}
