import { useEffect, useState } from 'react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import Avatar from './Avatar';
import { commentsKey, fetcher, request } from '../lib/api';

const MAX_LENGTH = 500;

/**
 * Every comment on a workout, plus a box to add one. `onCountChange` reports
 * the number of comments so the card's count stays in sync.
 */
export default function WorkoutComments({ owner, date, onCountChange }) {
  const { data: comments, error, isLoading, mutate } = useSWR(commentsKey({ owner, date }), fetcher);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (comments) onCountChange(comments.length);
  }, [comments, onCountChange]);

  const post = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);
    try {
      const { data, censored } = await request('/api/workouts/comments', { method: 'POST', body: { owner, date, text: value } });
      // Show it right away, then refetch in case the list hadn't finished loading
      mutate((current) => (current ? [...current, data] : current));
      setText('');
      if (censored) toast('Some words were censored', { icon: '🤐' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  };

  const remove = async (comment) => {
    mutate((current) => current?.filter((c) => c.id !== comment.id), { revalidate: false });
    try {
      await request(`/api/workouts/comments/${comment.id}`, { method: 'DELETE' });
      toast.success('Comment deleted');
    } catch (err) {
      mutate();
      toast.error(err.message);
    }
  };

  return (
    <div className="tk-comments">
      {isLoading && (
        <div className="tk-feed-status">
          <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading comments" />
        </div>
      )}
      {error && !comments && <p className="tk-hint">Couldn&apos;t load comments.</p>}
      {comments?.length > 0 && (
        <ul className="tk-comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="tk-comment">
              <Avatar user={comment.author} size={30} />
              <div className="tk-comment-body">
                <div className="tk-comment-head">
                  <strong>{comment.author.displayName}</strong>
                  <time dateTime={comment.createdAt}>{moment(comment.createdAt).fromNow()}</time>
                </div>
                <p className="tk-comment-text">{comment.text}</p>
              </div>
              {comment.canDelete && (
                <button
                  type="button"
                  className="tk-icon-btn tk-icon-btn-sm"
                  aria-label={`Delete comment by ${comment.author.displayName}`}
                  onClick={() => remove(comment)}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className="tk-comment-form" onSubmit={post}>
        <input
          className="tk-input"
          placeholder="Add a comment…"
          aria-label="Add a comment"
          maxLength={MAX_LENGTH}
          enterKeyHint="send"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="tk-comment-send" disabled={!text.trim() || posting} aria-label="Post comment">
          {posting
            ? <span className="spinner-border spinner-border-sm" role="status" aria-label="Posting" />
            : <FontAwesomeIcon icon={faPaperPlane} />}
        </button>
      </form>
    </div>
  );
}
