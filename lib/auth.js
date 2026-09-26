import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';

// The signed-in user's session, or null. API routes must scope every query by
// session.userId rather than trusting a userId sent from the client.
export async function getSession(req, res) {
  const session = await getServerSession(req, res, authOptions);
  return session?.userId ? session : null;
}

export async function getUserId(req, res) {
  return (await getSession(req, res))?.userId ?? null;
}
