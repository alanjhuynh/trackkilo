import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR, { mutate as mutateKey } from 'swr';
import toast from 'react-hot-toast';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck, faLink, faMagnifyingGlass, faShareNodes, faUserGroup, faUserPlus, faUserXmark, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import ActivityFeed from '../components/ActivityFeed';
import Avatar from '../components/Avatar';
import ConfirmModal from '../components/ConfirmModal';
import { RequestBadge } from '../components/Sidebar';
import useFriends from '../lib/useFriends';
import useProfile from '../lib/useProfile';
import { fetcher, request } from '../lib/api';
import { plural } from '../lib/format';

const SEARCH_DELAY_MS = 250;

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function Person({ user, meta, children }) {
  return (
    <li className="tk-person">
      <Avatar user={user} size={40} />
      <div className="tk-person-text">
        <div className="tk-person-name">{user.displayName}</div>
        <div className="tk-person-meta">@{user.username}{meta ? ` · ${meta}` : ''}</div>
      </div>
      <div className="tk-person-actions">{children}</div>
    </li>
  );
}

const Spinner = () => <span className="spinner-border spinner-border-sm" role="status" aria-label="Working" />;

// Search, invites, requests and the friends list
function FriendsManager() {
  const router = useRouter();
  const { profile } = useProfile();
  const { friends, incoming, outgoing, isLoading, mutate: mutateFriends } = useFriends();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(null); // key of the row whose action is running
  const [removing, setRemoving] = useState(null); // friend awaiting confirmation
  const [canShare, setCanShare] = useState(false);
  const inputRef = useRef(null);

  const search = useDebounced(query.trim().replace(/^@/, '').toLowerCase(), SEARCH_DELAY_MS);
  const searchKey = search.length >= 2 ? `/api/users/search?q=${encodeURIComponent(search)}` : null;
  const { data: results, isLoading: searching, mutate: mutateSearch } = useSWR(searchKey, fetcher);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  // Invite links look like /friends?add=username
  useEffect(() => {
    const { add } = router.query;
    if (typeof add === 'string' && add) {
      setQuery(add);
      inputRef.current?.focus();
    }
  }, [router.query]);

  const refresh = () => {
    mutateFriends();
    mutateSearch();
    mutateKey((key) => typeof key === 'string' && key.startsWith('/api/leaderboard'));
  };

  const run = async (key, action) => {
    setBusy(key);
    try {
      const message = await action();
      if (message) toast.success(message);
      refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  const sendRequest = (username) => run(`add:${username}`, async () => {
    const { data } = await request('/api/friends', { method: 'POST', body: { username } });
    return data.status === 'accepted' ? `You and @${username} are now friends` : `Request sent to @${username}`;
  });

  const accept = (id, user) => run(id, async () => {
    await request(`/api/friends/${id}`, { method: 'PATCH' });
    return `You and @${user.username} are now friends`;
  });

  const remove = (id, message) => run(id, async () => {
    await request(`/api/friends/${id}`, { method: 'DELETE' });
    return message;
  });

  const inviteUrl = profile ? `${window.location.origin}/friends?add=${profile.username}` : '';

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied');
    } catch (error) {
      toast.error('Couldn’t copy the link');
    }
  };

  const shareInvite = async () => {
    try {
      await navigator.share({ title: 'trackkilo', text: `Add me on trackkilo: @${profile.username}`, url: inviteUrl });
    } catch (error) {
      if (error.name !== 'AbortError') copyInvite();
    }
  };

  const resultAction = (result) => {
    const key = `add:${result.username}`;
    switch (result.relationship) {
      case 'friend':
        return <span className="tk-pill"><FontAwesomeIcon icon={faCheck} /> Friends</span>;
      case 'outgoing':
        return <span className="tk-pill">Requested</span>;
      case 'incoming':
        return (
          <button type="button" className="tk-btn tk-btn-sm tk-btn-primary" disabled={busy === result.friendshipId}
            onClick={() => accept(result.friendshipId, result)}>
            {busy === result.friendshipId ? <Spinner /> : 'Accept'}
          </button>
        );
      default:
        return (
          <button type="button" className="tk-btn tk-btn-sm tk-btn-primary" disabled={busy === key}
            onClick={() => sendRequest(result.username)}>
            {busy === key ? <Spinner /> : <><FontAwesomeIcon icon={faUserPlus} /> Add</>}
          </button>
        );
    }
  };

  return (
    <>
      <section className="tk-card tk-section" aria-labelledby="add-friend-title">
        <h2 id="add-friend-title" className="tk-section-title">Add a friend</h2>
        <div className="tk-search">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="tk-search-icon" />
          <input
            ref={inputRef}
            className="tk-input"
            type="search"
            inputMode="search"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search by username"
            aria-label="Search by username"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {searchKey && (
          <ul className="tk-person-list" aria-live="polite">
            {results?.map((result) => (
              <Person key={result.username} user={result}>{resultAction(result)}</Person>
            ))}
            {results && !results.length && !searching && (
              <li className="tk-empty-inline">No one with a username starting “{search}”</li>
            )}
          </ul>
        )}

        {profile && (
          <div className="tk-invite">
            <div className="tk-invite-text">
              Your username is <strong>@{profile.username}</strong>. Friends can search for it, or you can send them an invite link.
            </div>
            <div className="tk-invite-actions">
              <button type="button" className="tk-btn tk-btn-sm tk-btn-secondary" onClick={copyInvite}>
                <FontAwesomeIcon icon={faLink} /> Copy invite link
              </button>
              {canShare && (
                <button type="button" className="tk-btn tk-btn-sm tk-btn-secondary" onClick={shareInvite}>
                  <FontAwesomeIcon icon={faShareNodes} /> Share
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="tk-card tk-section" aria-labelledby="incoming-title">
          <h2 id="incoming-title" className="tk-section-title">
            Friend requests <span className="tk-count">{incoming.length}</span>
          </h2>
          <ul className="tk-person-list">
            {incoming.map((entry) => (
              <Person key={entry.id} user={entry.user} meta={moment(entry.since).fromNow()}>
                <button type="button" className="tk-btn tk-btn-sm tk-btn-primary" disabled={busy === entry.id}
                  onClick={() => accept(entry.id, entry.user)}>
                  {busy === entry.id ? <Spinner /> : 'Accept'}
                </button>
                <button type="button" className="tk-icon-btn tk-icon-btn-sm" aria-label={`Decline @${entry.user.username}`}
                  disabled={busy === entry.id} onClick={() => remove(entry.id, 'Request declined')}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </Person>
            ))}
          </ul>
        </section>
      )}

      <section className="tk-card tk-section" aria-labelledby="friends-title">
        <h2 id="friends-title" className="tk-section-title">
          Your friends {friends.length > 0 && <span className="tk-count">{friends.length}</span>}
        </h2>
        {isLoading && <div className="tk-feed-status"><Spinner /></div>}
        {!isLoading && !friends.length && (
          <div className="tk-empty-inline">
            <FontAwesomeIcon icon={faUserGroup} /> No friends yet. Search for someone above or share your invite link.
          </div>
        )}
        <ul className="tk-person-list">
          {friends.map((entry) => (
            <Person key={entry.id} user={entry.user} meta={`friends since ${moment(entry.since).format('MMM YYYY')}`}>
              <button type="button" className="tk-icon-btn tk-icon-btn-sm" aria-label={`Remove @${entry.user.username}`}
                disabled={busy === entry.id} onClick={() => setRemoving(entry)}>
                <FontAwesomeIcon icon={faUserXmark} />
              </button>
            </Person>
          ))}
        </ul>
      </section>

      {outgoing.length > 0 && (
        <section className="tk-card tk-section" aria-labelledby="outgoing-title">
          <h2 id="outgoing-title" className="tk-section-title">Sent requests</h2>
          <ul className="tk-person-list">
            {outgoing.map((entry) => (
              <Person key={entry.id} user={entry.user} meta={`sent ${moment(entry.since).fromNow()}`}>
                <button type="button" className="tk-btn tk-btn-sm tk-btn-ghost" disabled={busy === entry.id}
                  onClick={() => remove(entry.id, 'Request canceled')}>
                  {busy === entry.id ? <Spinner /> : 'Cancel'}
                </button>
              </Person>
            ))}
          </ul>
        </section>
      )}

      <ConfirmModal
        show={Boolean(removing)}
        title={removing ? `Remove @${removing.user.username}?` : 'Remove friend?'}
        confirmLabel="Remove"
        busy={busy === removing?.id}
        onHide={() => setRemoving(null)}
        onConfirm={async () => {
          await remove(removing.id, `Removed @${removing.user.username}`);
          setRemoving(null);
        }}
      >
        You won’t see each other’s workouts or be on each other’s leaderboard anymore. You can add them again later.
      </ConfirmModal>
    </>
  );
}

const TABS = [
  { key: 'activity', label: 'Activity', eyebrow: 'What you and your friends have been up to' },
  { key: 'friends', label: 'Friends', eyebrow: 'Add friends to see their workouts and compare progress' },
];

// Activity feed and friend management, as tabs (?tab=friends; invite links open Friends)
const Friends = () => {
  const router = useRouter();
  const { friends, incoming } = useFriends();
  const { tab: requested, add } = router.query;
  const tabKey = TABS.some((t) => t.key === requested) ? requested : (add ? 'friends' : 'activity');
  const tab = TABS.find((t) => t.key === tabKey);

  const showTab = (key) => {
    router.replace({ pathname: '/friends', query: key === 'activity' ? {} : { tab: key } }, undefined, { shallow: true });
  };

  return (
    <div className="tk-page tk-page-narrow">
      <Head><title>{tabKey === 'activity' ? 'Activity' : 'Friends'} · trackkilo</title></Head>
      <header className="tk-page-header">
        <div>
          <p className="tk-eyebrow">{tab.eyebrow}</p>
          <h1 className="tk-page-title">Friends</h1>
        </div>
      </header>

      <div className="tk-segmented tk-tabs" role="tablist" aria-label="Friends">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tabKey === t.key}
            aria-pressed={tabKey === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => showTab(t.key)}
          >
            {t.label}
            {t.key === 'friends' && <RequestBadge count={incoming.length} />}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tabKey}`} aria-labelledby={`tab-${tabKey}`}>
        {tabKey === 'activity' ? (
          <>
            {incoming.length > 0 && (
              <button type="button" className="tk-callout tk-callout-button" onClick={() => showTab('friends')}>
                <span>
                  <strong>{plural(incoming.length, 'friend request')}</strong> waiting for you
                </span>
                <span className="tk-link-btn">Review</span>
              </button>
            )}
            <ActivityFeed hasFriends={friends.length > 0} onFindFriends={() => showTab('friends')} />
          </>
        ) : (
          <FriendsManager />
        )}
      </div>
    </div>
  );
};

export default Friends;
