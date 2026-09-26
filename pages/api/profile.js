import dbConnect from '../../lib/dbConnect';
import Profile from '../../models/Profile';
import { getSession } from '../../lib/auth';
import { cleanDisplayName, getOrCreateProfile, publicProfile, validateUsername } from '../../lib/profiles';

export default async function handler(req, res) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  await dbConnect();

  switch (req.method) {
    case 'GET':
      try {
        const profile = await getOrCreateProfile(session);
        res.status(200).json({ success: true, data: publicProfile(profile) });
      } catch (error) {
        console.error('Failed to load profile', error);
        res.status(500).json({ success: false });
      }
      break;

    case 'PUT': {
      const { username, displayName } = req.body || {};
      const nextUsername = typeof username === 'string' ? username.trim().replace(/^@/, '').toLowerCase() : '';
      const usernameError = validateUsername(nextUsername);
      if (usernameError) {
        return res.status(400).json({ success: false, field: 'username', message: usernameError });
      }

      const cleanName = cleanDisplayName(displayName);
      if (!cleanName.text) {
        return res.status(400).json({ success: false, field: 'displayName', message: 'Enter a display name' });
      }

      try {
        const profile = await getOrCreateProfile(session);
        if (nextUsername !== profile.username && await Profile.exists({ username: nextUsername })) {
          return res.status(409).json({ success: false, field: 'username', message: 'That username is taken' });
        }

        profile.username = nextUsername;
        profile.displayName = cleanName.text;
        await profile.save();
        res.status(200).json({ success: true, data: publicProfile(profile), censored: cleanName.censored });
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(409).json({ success: false, field: 'username', message: 'That username is taken' });
        }
        console.error('Failed to update profile', error);
        res.status(500).json({ success: false });
      }
      break;
    }

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).json({ success: false });
      break;
  }
}
