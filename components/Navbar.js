import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

function Navbar() {
    const {data: session } = useSession();

    return (
        <nav className="navbar navbar-dark bg-dark sticky-top">
            <div className="flex-between-center w-100 mx-5">
                <Link href="/" className="nav-link">
                    <h2>track<span className="text-muted notranslate">kilo</span></h2>
                </Link>
                <div className="dropdown">
                    <a data-bs-toggle="dropdown">
                        {session && <img className="rounded-circle profile-pic" src={session?.user?.image ? session.user.image : "user.svg"}></img>}
                    </a>
                    <div className="dropdown-menu dropdown-menu-end">
                        <button onClick={() => signOut({callbackUrl: '/login'})} className="dropdown-item" type="button">Sign Out</button>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;