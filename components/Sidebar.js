import Link from 'next/link';

function Sidebar() {
    return (
        
        <div className="d-flex flex-column flex-shrink-0 px-3 bg-dark-2 h-100">
          <ul className="nav nav-pills flex-column mb-auto mt-4">
            <li className="nav-item">
              <Link href="/" className="nav-link active bg-primary-2" aria-current="page">
                Home
              </Link>
            </li>
            <li>
              <Link href="/stats" className="nav-link">
                Stats
              </Link>
            </li>
            <li>
              <Link href="/new" className="nav-link">
                Add Lift
              </Link>
            </li>
          </ul>
      </div>
    )
}

export default Sidebar;