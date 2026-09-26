import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

// The signed-in user's id, or null. API routes must scope every query by this
// value rather than trusting a userId sent from the client.
export async function getUserId(req, res) {
  const session = await getServerSession(req, res, authOptions);
  return session?.userId ?? null;
}
