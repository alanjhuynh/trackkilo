import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSession } from 'next-auth/react';
import LiftModal from './LiftModal';

function Subheader() {
    const { data: session } = useSession();
    const liftForm = {
        userId: session?.userId,
        name: '',
        set: '',
        rep: '',
        note: '',
        date: Date.now, 
        }

  return (
        <div className="d-flex flex-row-reverse mb-2">
            <LiftModal lift={liftForm}></LiftModal>
        </div>
    )
}

export default Subheader;