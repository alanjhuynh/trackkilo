import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartSolid } from '@fortawesome/free-solid-svg-icons';
import { faComment, faHeart } from '@fortawesome/free-regular-svg-icons';
import Avatar from './Avatar';
import KindIcon from './KindIcon';
import WorkoutComments from './WorkoutComments';
import { request } from '../lib/api';
import { dayKey, describeDay, summarizeSets } from '../lib/format';
import { formatPace, isCardio, summarizeCardio } from '../lib/activities';

// "Liked by You, Bobby and 2 others"
function likedByText({ count, liked, names }) {
  const shown = liked ? ['You', ...names] : names;
  if (!count || !shown.length) return null;
  const others = count - shown.length;
  if (others > 0) return `Liked by ${shown.join(', ')} and ${others} ${others === 1 ? 'other' : 'others'}`;
  if (shown.length === 1) return `Liked by ${shown[0]}`;
  return `Liked by ${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

function entryDetail(entry) {
  if (!isCardio(entry)) return summarizeSets(entry);
  const pace = formatPace(entry);
  return [summarizeCardio(entry), pace].filter(Boolean).join(' · ');
}

/**
 * One workout in the activity feed: everything someone logged on a day, with
 * likes and comments. Likes update optimistically.
 */
export default function WorkoutCard({ workout }) {
  const { owner, isYours, date, entries } = workout;
  const [likes, setLikes] = useState(workout.likes);
  const [commentCount, setCommentCount] = useState(workout.comments.count);
  const [showComments, setShowComments] = useState(false);
  const { label, detail } = describeDay(dayKey(date));

  // A refreshed feed brings newer numbers
  useEffect(() => setLikes(workout.likes), [workout.likes]);
  useEffect(() => setCommentCount(workout.comments.count), [workout.comments.count]);

  const toggleLike = async () => {
    const liked = !likes.liked;
    const change = liked ? 1 : -1;
    setLikes((current) => ({ ...current, liked, count: current.count + change }));
    try {
      const { data } = await request('/api/workouts/like', { method: 'POST', body: { owner: owner.username, date, liked } });
      setLikes((current) => ({ ...current, liked: data.liked, count: data.count }));
    } catch (error) {
      setLikes((current) => ({ ...current, liked: !liked, count: current.count - change }));
      toast.error(error.message);
    }
  };

  const likedBy = likedByText(likes);
  const { recent } = workout.comments;

  return (
    <article className="tk-card tk-workout">
      <header className="tk-workout-header">
        <Avatar user={owner} size={40} />
        <div className="tk-person-text">
          <div className="tk-person-name">
            {owner.displayName}
            {isYours && <span className="tk-you">You</span>}
          </div>
          <div className="tk-person-meta">
            @{owner.username} · {label}{detail ? `, ${detail}` : ''}
          </div>
        </div>
      </header>

      <ul className="tk-workout-entries">
        {entries.map((entry) => (
          <li key={entry._id}>
            <span className={`tk-kind-badge tk-kind-badge-sm${isCardio(entry) ? ` tk-kind-${entry.kind}` : ''}`}>
              <KindIcon kind={entry.kind} />
            </span>
            <span className="tk-workout-entry-name">{entry.name}</span>
            <span className="tk-workout-entry-detail">{entryDetail(entry)}</span>
          </li>
        ))}
      </ul>

      <div className="tk-workout-actions">
        <button
          type="button"
          className={`tk-reaction${likes.liked ? ' is-liked' : ''}`}
          aria-pressed={likes.liked}
          onClick={toggleLike}
        >
          <FontAwesomeIcon icon={likes.liked ? faHeartSolid : faHeart} />
          {likes.liked ? 'Liked' : 'Like'}
          {likes.count > 0 && <span className="tk-reaction-count">{likes.count}</span>}
        </button>
        <button
          type="button"
          className={`tk-reaction${showComments ? ' is-open' : ''}`}
          aria-expanded={showComments}
          onClick={() => setShowComments((open) => !open)}
        >
          <FontAwesomeIcon icon={faComment} />
          Comment
          {commentCount > 0 && <span className="tk-reaction-count">{commentCount}</span>}
        </button>
      </div>

      {likedBy && <p className="tk-workout-likers">{likedBy}</p>}

      {showComments ? (
        <WorkoutComments owner={owner.username} date={date} onCountChange={setCommentCount} />
      ) : recent.length > 0 && (
        <button type="button" className="tk-comment-preview" onClick={() => setShowComments(true)}>
          {recent.map((comment) => (
            <span key={comment.id} className="tk-comment-preview-line">
              <strong>{comment.author.displayName}</strong> {comment.text}
            </span>
          ))}
          {commentCount > recent.length && (
            <span className="tk-comment-preview-more">View all {commentCount} comments</span>
          )}
        </button>
      )}
    </article>
  );
}
