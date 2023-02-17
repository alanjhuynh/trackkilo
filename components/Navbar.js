import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

function Navbar() {
    const {data: session } = useSession();

    return (
        <nav className="navbar navbar-dark bg-dark">
            <div className="d-flex justify-content-between align-items-center w-100 mx-5">
                <Link href="/" className="text-white text-decoration-none">
                    <h2>track<span className="text-muted">kilo</span></h2>
                </Link>
                <div className="dropdown">
                    <a data-bs-toggle="dropdown">
                        <img className="rounded-circle profile-pic" src={session?.user?.image ? session.user.image : "user.svg"}></img>
                    </a>
                    <div className="dropdown-menu dropdown-menu-end">
                        <button onClick={() => signOut()} className="dropdown-item" type="button">Sign Out</button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;