import { useState } from 'react';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';

// Profile picture with an initials fallback. `user` has displayName (or name) and image.
export default function Avatar({ user, size = 34, className = '' }) {
  const [failed, setFailed] = useState(false);
  const name = user?.displayName || user?.name || '';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };

  if (user?.image && !failed) {
    // Google avatars can refuse requests that send a referrer
    return (
      <img
        className={`tk-avatar ${className}`}
        style={style}
        src={user.image}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className={`tk-avatar tk-avatar-initials ${className}`} style={style} aria-hidden="true">{initials(name)}</span>;
}
