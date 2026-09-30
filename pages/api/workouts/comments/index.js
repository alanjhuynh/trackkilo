import dbConnect from '../../../../lib/dbConnect';
import WorkoutComment from '../../../../models/WorkoutComment';
import { getUserId } from '../../../../lib/auth';
import { censorText } from '../../../../lib/profanity';
import {
  MAX_COMMENT_LENGTH, findWorkout, profilesById, serializeComment,
} from '../../../../lib/workouts';

/**
 * GET ?owner=username&date=ISO: every comment on a workout, oldest first.
 * POST { owner, date, text }: add a comment (bad words are masked).
 */
export default async function handler(req, res) {
  const userId = await getUserId(req, res);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  await dbConnect();

  try {
    switch (req.method) {
      case 'GET': {
        const workout = await findWorkout(userId, req.query.owner, req.query.date);
        if (workout.status) {
          return res.status(workout.status).json({ success: false, message: workout.message });
        }
        const comments = await WorkoutComment.find({ ownerId: workout.ownerId, date: workout.date })
          .sort({ createdAt: 1, _id: 1 })
          .lean();
        const authors = await profilesById(comments.map((comment) => comment.userId));
        return res.status(200).json({
          success: true,
          data: comments.map((comment) => serializeComment(comment, authors, userId)),
        });
      }

      case 'POST': {
        const { owner, date } = req.body || {};
        const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
        if (!text) {
          return res.status(400).json({ success: false, message: 'Write a comment first' });
        }
        if (text.length > MAX_COMMENT_LENGTH) {
          return res.status(400).json({ success: false, message: `Comments can be up to ${MAX_COMMENT_LENGTH} characters` });
        }

        const workout = await findWorkout(userId, owner, date);
        if (workout.status) {
          return res.status(workout.status).json({ success: false, message: workout.message });
        }

        const clean = censorText(text);
        const comment = await WorkoutComment.create({
          ownerId: workout.ownerId,
          date: workout.date,
          userId,
          text: clean.text,
        });
        const authors = await profilesById([userId]);
        return res.status(201).json({
          success: true,
          data: serializeComment(comment, authors, userId),
          censored: clean.censored,
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false });
    }
  } catch (error) {
    console.error('Comments request failed', error);
    return res.status(500).json({ success: false });
  }
}
