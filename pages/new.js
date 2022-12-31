import Form from '../components/Form'

const NewLift = () => {
  const liftForm = {
    userId: 0,
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
