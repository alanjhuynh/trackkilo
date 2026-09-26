import { useState } from 'react';
import Link from 'next/link';
import Dropdown from 'react-bootstrap/Dropdown';
import { useSession, signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';

function Avatar({ user }) {
  const [failed, setFailed] = useState(false);
  if (user?.image && !failed) {
    // Google avatars can refuse requests that send a referrer
    return <img className="tk-avatar" src={user.image} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  }
  return <span className="tk-avatar tk-avatar-initials">{initials(user?.name)}</span>;
}

export function Brand({ className = '' }) {
  return <span className={`tk-brand ${className}`}>track<span>kilo</span></span>;
}

function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="tk-navbar sticky-top">
      <Link href="/" aria-label="trackkilo home">
        <Brand />
      </Link>
      <Dropdown align="end">
        <Dropdown.Toggle as="button" type="button" bsPrefix="tk-avatar-btn" aria-label="Account menu">
          <Avatar user={user} />
        </Dropdown.Toggle>
        <Dropdown.Menu className="tk-menu">
          <div className="tk-menu-header">
            <div className="tk-menu-name">{user?.name}</div>
            <div className="tk-menu-email">{user?.email}</div>
          </div>
          <Dropdown.Divider />
          <Dropdown.Item as="button" onClick={() => signOut({ callbackUrl: '/login' })}>
            <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </header>
  );
}

export default Navbar;
