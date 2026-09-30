import dbConnect from '../../lib/dbConnect';
import Profile from '../../models/Profile';
import { getSession } from '../../lib/auth';
import { cleanDisplayName, getOrCreateProfile, publicProfile, validateUsername } from '../../lib/profiles';

// Your own profile, including private settings
const ownProfile = (profile) => ({ ...publicProfile(profile), publicLeaderboard: Boolean(profile.publicLeaderboard) });

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
        res.status(200).json({ success: true, data: ownProfile(profile) });
      } catch (error) {
        console.error('Failed to load profile', error);
        res.status(500).json({ success: false });
      }
      break;

    // Updates any of username, displayName and publicLeaderboard
    case 'PUT': {
      const { username, displayName, publicLeaderboard } = req.body || {};
      const updates = {};
      let censored = false;

      if (username !== undefined) {
        updates.username = typeof username === 'string' ? username.trim().replace(/^@/, '').toLowerCase() : '';
        const usernameError = validateUsername(updates.username);
        if (usernameError) {
          return res.status(400).json({ success: false, field: 'username', message: usernameError });
        }
      }

      if (displayName !== undefined) {
        const cleanName = cleanDisplayName(displayName);
        if (!cleanName.text) {
          return res.status(400).json({ success: false, field: 'displayName', message: 'Enter a display name' });
        }
        updates.displayName = cleanName.text;
        censored = cleanName.censored;
      }

      if (publicLeaderboard !== undefined) {
        if (typeof publicLeaderboard !== 'boolean') {
          return res.status(400).json({ success: false, field: 'publicLeaderboard', message: 'Invalid setting' });
        }
        updates.publicLeaderboard = publicLeaderboard;
      }

      try {
        const profile = await getOrCreateProfile(session);
        if (updates.username && updates.username !== profile.username && await Profile.exists({ username: updates.username })) {
          return res.status(409).json({ success: false, field: 'username', message: 'That username is taken' });
        }

        Object.assign(profile, updates);
        await profile.save();
        res.status(200).json({ success: true, data: ownProfile(profile), censored });
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
