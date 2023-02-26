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
            <div className="flex-center h-75">
                <div className="w-25 h-75 bg-dark rounded text-center">
                    <h2 className="mt-4">Login</h2>
                    <div className="mt-1">
                        <img className="w-50 rounded" src="https://media.tenor.com/uKWmvSxGj3gAAAAd/gym-wow.gif"></img>
                    </div>
                    <button className="btn bg-primary-2 text-white mt-4" onClick={() => signIn('google')}>Sign In With Google</button>
                </div>  
            </div>
        );
    }
}

export default login;