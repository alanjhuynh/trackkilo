import Link from 'next/link'
import dbConnect from '../lib/dbConnect'
import Lift from '../models/Lift'
import { useRouter } from 'next/router'

const Index = ({ lifts }) => {
  const router = useRouter()
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
  
  return (
  <>
    {/* Create a card for each lift */}
    {lifts.map((lift) => (
      <div className="d-flex justify-content-center my-2" key={lift._id}>
        <div className="card w-50">
          <h5 className="lift-name">{lift.name}</h5>
          <div className="main-content">
            <p className="lift-name">{lift.name}</p>
            <p className="lift-set">{lift.set}</p>
            <p className="lift-rep">{lift.rep}</p>
            <p className="lift-weight">{lift.weight} {lift.metric}</p>
            <p className="lift-note">{lift.note}</p>
            <p className="lift-date">{lift.date}</p>

            <div>
              <Link href="/[id]/edit" as={`/${lift._id}/edit`} legacyBehavior>
                <button className="btn edit">Edit</button>
              </Link>
              <button className="btn delete" onClick={()=>{handleDelete(lift._id)}}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    ))}
  </>
)}

/* Retrieves lift(s) data from mongodb database */
export async function getServerSideProps() {
  await dbConnect()

  /* find all the data in our database */
  const result = await Lift.find({})
  const lifts = result.map((doc) => {
    const lift = doc.toObject()
    lift._id = lift._id.toString()
    lift.date = lift.date.toString()
    return lift
  })

  return { props: { lifts: lifts } }
}

export default Index
