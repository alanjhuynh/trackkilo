import Link from 'next/link'
import dbConnect from '../lib/dbConnect'
import Lift from '../models/Lift'
import { useRouter } from 'next/router'
import { useSession, getSession } from 'next-auth/react';
import Card from '../components/Card';
import { chunk } from 'lodash';

const Index = ({ lifts }) => {
  const router = useRouter();
  const { data: session, status } = useSession({required: true});

  const handleDelete = async (liftId) => {
    try {
      await fetch(`/api/lifts/${liftId}`, {
        method: 'Delete',
      })
      router.push('/')
    } catch (error) {
      console.log(error)
      console.log('Failed to delete the lift.')
    }
  }

  let targetLifts = chunk(lifts, 3);

  if (status === 'authenticated'){
    return (
      <div className="my-4 mx-5">
        {/* Create a card for each lift */}
        {targetLifts.map((lifts) => (
          <div className="row">
            {lifts.map((lift) => (
              <div className="col">
                <Card lift={lift} isNew={false}></Card>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  } 
}

/* Retrieves lift(s) data from mongodb database */
export async function getServerSideProps(context) {
  const session = await getSession(context);
  if(!session) {
    return {
      redirect: {
        destination: '/login',
      }
    }
  }

  await dbConnect()

  /* find all the data in our database */
  const result = await Lift.find({userId: session.userId})
  const lifts = result.map((doc) => {
    const lift = doc.toObject()
    lift._id = lift._id.toString()
    lift.date = lift.date.toString()
    return lift
  })

  return { props: { lifts: lifts } }
}

export default Index
