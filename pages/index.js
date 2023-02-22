import Link from 'next/link'
import dbConnect from '../lib/dbConnect'
import Lift from '../models/Lift'
import Set from '../models/Set';
import { useRouter } from 'next/router'
import { useSession, getSession } from 'next-auth/react';
import Card from '../components/Card';
import { chunk, cloneDeep, each, set } from 'lodash';
import Subheader from '../components/Subheader';

const Index = ({ lifts, sets }) => {
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

  if (status === 'authenticated'){
    return (
      <div className="my-4 mx-5">
        <Subheader></Subheader>
        {/* Create a card for each lift */}
        <div className="row">
          {lifts.map((lift) => (
            <div key={lift._id} className="col-sm-4 g-3">
              <Card lift={lift} isNew={false}></Card>
            </div>
          ))}
        </div>
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
  let result = await Lift.find({userId: session.userId})
  let lifts = result.map((doc) => {
    const lift = doc.toObject()
    lift._id = lift._id.toString()
    lift.date = lift.date.toString()
    return lift
  })

  for (let i = 0; i < lifts.length; i++){
    let result = await Set.find({
      liftId: lifts[i]._id,
      userId: session.userId,
    });
    let sets = result.map((doc) => {
      const set = doc.toObject();
      set._id = set._id.toString();
      return set;
    })

    let targetSets = {};
    each(sets, (set) => {
      targetSets[set.index] = set;
    })
    lifts[i].sets = targetSets;    
  }

  return { props: { lifts: lifts} }
}

export default Index
