import Link from 'next/link'
import dbConnect from '../lib/dbConnect'
import Lift from '../models/Lift'
import Set from '../models/Set';
import { useRouter } from 'next/router'
import { useSession, getSession } from 'next-auth/react';
import Card from '../components/Card';
import { chunk, cloneDeep, each, isEmpty, set } from 'lodash';
import Subheader from '../components/Subheader';
import Sidebar from '../components/Sidebar';
import { FontAwesomeIcon } from '../node_modules/@fortawesome/react-fontawesome/index';
import { LiftContext, LiftProvider } from '../components/LiftProvider';
import { useContext, useEffect } from 'react';

const Index = ({ lifts, sets }) => {
  const router = useRouter();
  const { data: session, status } = useSession({required: true});
  const [state, setState] = useContext(LiftContext);

  useEffect(() => {
    setState(lifts)
  }, []);

  state.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let liftsByDate = state.reduce((group, lift) => {
    let date = new Date(lift.date).toISOString().substring(0, 10);
    if (!group[date]) {
      group[date] = [];
    }
    group[date].push(lift);
    return group;
  }, {});

  let cardsByDate = [];
  each (liftsByDate, (lifts, date) => {
    let liftsEl = lifts.map((lift) => (
      <div key={lift._id} className="col-sm-4 g-2">
        <Card lift={lift} isNew={ false}></Card>
      </div>
    ));
    cardsByDate.push(
      <div key={date} className="row mb-5">
        <h3 className="">{date}</h3>
        {liftsEl}
      </div>
    );
  })

  if (status === 'authenticated'){
    return (
      <>
        <div className="d-none d-sm-block col-sm-2 p-0">
          <Sidebar></Sidebar>
        </div>
        <div className="col col-sm-10 p-0 bg-dark-2">
          <div className="my-4 mx-5">
            <Subheader></Subheader>
            {/* Create a card for each lift */}
            <div>
              {cardsByDate}
            </div>
          </div>
        </div>
      </>
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
