import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function Sidebar() {
  return (
        <div className="d-flex flex-column flex-shrink-0 px-3 bg-dark-2 h-100">
          <ul className="nav nav-pills flex-column mb-auto mt-4">
            <li className="nav-item">
              <Link href="/" className="nav-link active bg-primary-2 flex-between-center">
                <span>Home</span>
                <FontAwesomeIcon icon="fa-solid fa-house" />
              </Link>
            </li>
            <li>
              <Link href="/stats" className="nav-link flex-between-center">
                <span>Stats</span>
                <FontAwesomeIcon icon="fa-solid fa-chart-line" />
              </Link>
            </li>
          </ul>
      </div>
    )
}

export default Sidebar;