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
                <div className="tenor-gif-embed w-25 h-25 border-rounded" data-postid="15177648" data-share-method="host" data-aspect-ratio="0.953125" data-width="100%"><a href="https://tenor.com/view/optical-illusion-machio-san-machio-how-heavy-are-the-dumbbells-you-lift-gif-15177648">Optical Illusion Machio San GIF</a>from <a href="https://tenor.com/search/optical+illusion-gifs">Optical Illusion GIFs</a></div> <script type="text/javascript" async src="https://tenor.com/embed.js"></script>
                <button className="btn btn-secondary" onClick={() => signIn()}>Sign In</button>
            </div>
        );
    }
}

export default login;