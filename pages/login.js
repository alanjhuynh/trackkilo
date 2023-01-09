import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

const login = () => {
    const {data: session } = useSession();
    const router = useRouter()

    if (session)
        router.push('/')
    else {
        return (
            <div>
                <button className="btn btn-secondary" onClick={() => signIn()}>Sign In</button>
            </div>
        );
    }
}

export default login;