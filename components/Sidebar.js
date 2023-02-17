import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

function Sidebar() {
    const {data: session } = useSession();

    //TODO: update
    if (!session)
        return (
            <div>loading</div>
        )
    return (
        
        <div className="d-flex flex-column flex-shrink-0 px-3 text-white bg-dark-2 h-100">
          <ul className="nav nav-pills flex-column mb-auto mt-4">
            <li className="nav-item">
              <Link href="/" className="nav-link active bg-primary-2" aria-current="page">
                Home
              </Link>
            </li>
            <li>
              <Link href="/stats" className="nav-link text-white">
                Stats
              </Link>
            </li>
            <li>
              <Link href="/new" className="nav-link text-white">
                Add Lift
              </Link>
            </li>
          </ul>
      </div>
    )
}

export default Sidebar;