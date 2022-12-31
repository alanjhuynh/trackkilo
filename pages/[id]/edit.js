import { useRouter } from 'next/router'
import useSWR from 'swr'
import Form from '../../components/Form'

const fetcher = (url) =>
  fetch(url)
    .then((res) => res.json())
    .then((json) => json.data)

const EditLift = () => {
  const router = useRouter()
  const { id } = router.query
  const { data: lift, error } = useSWR(id ? `/api/lifts/${id}` : null, fetcher)

  if (error) return <p>Failed to load</p>
  if (!lift) return <p>Loading...</p>

  const liftForm = {
    userId: lift.user_id,
    name: lift.name,
    set: lift.set,
    rep: lift.rep,
    weight: lift.weight,
    metric: lift.metric,
    note: lift.note,
  }

  return <Form formId="edit-lift-form" liftForm={liftForm} isNew={false} />
}

export default EditLift
