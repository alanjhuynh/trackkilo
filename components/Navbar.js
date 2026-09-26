import Link from 'next/link';
import Dropdown from 'react-bootstrap/Dropdown';
import { useSession, signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import Avatar from './Avatar';
import useProfile from '../lib/useProfile';

export function Brand({ className = '' }) {
  return <span className={`tk-brand ${className}`}>track<span>kilo</span></span>;
}

function Navbar() {
  const { data: session } = useSession();
  const { profile } = useProfile();
  const user = { displayName: profile?.displayName || session?.user?.name, image: session?.user?.image };

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
            <div className="tk-menu-name">{user.displayName}</div>
            {profile && <div className="tk-menu-email">@{profile.username}</div>}
            <div className="tk-menu-email">{session?.user?.email}</div>
          </div>
          <Dropdown.Divider />
          <Dropdown.Item as={Link} href="/settings">
            <FontAwesomeIcon icon={faGear} /> Settings
          </Dropdown.Item>
          <Dropdown.Item as="button" onClick={() => signOut({ callbackUrl: '/login' })}>
            <FontAwesomeIcon icon={faRightFromBracket} /> Sign out
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </header>
  );
}

export default Navbar;
