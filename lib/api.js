export const EXERCISES_KEY = '/api/exercises';
export const STATS_KEY = '/api/stats';

// JSON request to our API. Throws (with the server's message when it sent one)
// unless the response is `{ success: true }`.
export async function request(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body
      ? { Accept: 'application/json', 'Content-Type': 'application/json' }
      : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch (error) {
    // Non-JSON response; handled below
  }

  if (!res.ok || !json?.success) {
    const error = new Error(json?.message || 'Something went wrong');
    error.status = res.status;
    throw error;
  }
  return json;
}

// SWR fetcher that resolves to the response's `data`
export const fetcher = (url) => request(url).then((json) => json.data);
