import Form from '../components/Form'
import { useSession } from 'next-auth/react';

const NewLift = () => {
  const { data: session } = useSession();

  const liftForm = {
    userId: session?.userId,
    name: '',
    set: 0,
    rep: 0,
    weight: 0,
    metric: 'lb',
    note: ''
  }

  return <Form formId="add-lift-form" liftForm={liftForm} />
}

export default NewLift
