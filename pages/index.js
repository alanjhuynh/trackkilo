import { useRouter } from 'next/router'
import { useSession, getSession } from 'next-auth/react';
import Card from '../components/Card';
import { chunk, cloneDeep, each, isEmpty, set } from 'lodash';
import Subheader from '../components/Subheader';
import Sidebar from '../components/Sidebar';
import { FontAwesomeIcon } from '../node_modules/@fortawesome/react-fontawesome/index';
import { LiftContext, LiftProvider } from '../components/LiftProvider';
import { useContext, useEffect, useState } from 'react';

const Index = () => {
  const contentType = 'application/json';
  const router = useRouter();
  const { data: session, status } = useSession({required: true});
  const [state, setState] = useContext(LiftContext);
  const [isGetting, setIsGetting] = useState(false);

  const getData = async () => {
    try {
      const res = await fetch('/api/lifts', {
          method: 'GET',
          headers: {
          Accept: contentType,
          'Content-Type': contentType,
          },
      })
      const data = await res.json();

      if (!data.success) {
          throw new Error();
      }

      setState(data.data);
      setIsGetting(false);
      
    } catch (error) {
      setIsGetting(false);
      console.log('Failed to get lifts');
    }
}

  useEffect(() => {
    if (isEmpty(state)){
        setIsGetting(true);
        getData();
    }
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

  for (let date in liftsByDate) {
    liftsByDate[date].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

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
          <div className={isGetting ? "text-center" : "my-4 mx-5"}>
            <Subheader></Subheader>
            {/* Create a card for each lift */}
            {
              isGetting ? <div className="spinner-grow"></div> :
              isEmpty(state) ? 
                <div className="flex-center row text-center">
                  <FontAwesomeIcon icon="fa-solid fa-dumbbell" size="10x" />
                  <div><h2>No lifts found</h2></div>
                </div> 
                : 
                cardsByDate
            }

          </div>
        </div>
      </>
    )
  } 
}

export default Index
