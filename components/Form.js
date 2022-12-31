import { useState } from 'react'
import { useRouter } from 'next/router'
import { mutate } from 'swr'

const Form = ({ formId, liftForm, isNew = true }) => {
  const router = useRouter()
  const contentType = 'application/json'
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    name: liftForm.name,
    set: liftForm.set,
    rep: liftForm.rep,
    weight: liftForm.weight,
    metric: liftForm.metric,
    note: liftForm.note,
    date: liftForm.date,
  })

  /* The PUT method edits an existing entry in the mongodb database. */
  const putData = async (form) => {
    const { id } = router.query

    try {
      const res = await fetch(`/api/lifts/${id}`, {
        method: 'PUT',
        headers: {
          Accept: contentType,
          'Content-Type': contentType,
        },
        body: JSON.stringify(form),
      })

      // Throw error with status code in case Fetch API req failed
      if (!res.ok) {
        throw new Error(res.status)
      }

      const { data } = await res.json()

      mutate(`/api/lifts/${id}`, data, false) // Update the local data without a revalidation
      router.push('/')
    } catch (error) {
      setMessage('Failed to update lift')
    }
  }

  /* The POST method adds a new entry in the mongodb database. */
  const postData = async (form) => {
    try {
      const res = await fetch('/api/lifts', {
        method: 'POST',
        headers: {
          Accept: contentType,
          'Content-Type': contentType,
        },
        body: JSON.stringify(form),
      })

      // Throw error with status code in case Fetch API req failed
      if (!res.ok) {
        throw new Error(res.status)
      }

      router.push('/')
    } catch (error) {
      setMessage('Failed to add lift')
    }
  }

  const handleChange = (e) => {
    const target = e.target
    const value = target.value
    const name = target.name

    setForm({
      ...form,
      [name]: value,
    })
  }

  const formValidate = () => {
    let err = {}
    if (!form.name) err.name = 'Name is required'
    if (!form.set) err.set = 'Number of sets is required'
    if (!form.rep) err.rep = 'Number of reps is required'
    if (!form.weight) err.weight = 'Weight is required'
    return err
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = formValidate()
    if (Object.keys(errs).length === 0) {
      isNew ? postData(form) : putData(form)
    } else {
      setErrors({ errs })
    }
  }

  return (
    <>
      <form id={formId} onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <label htmlFor="set">Set</label>
        <input
          type="number"
          name="set"
          value={form.set}
          onChange={handleChange}
          required
        />

        <label htmlFor="rep">Rep</label>
        <input
          type="number"
          name="rep"
          value={form.rep}
          onChange={handleChange}
          required
        />

        <label htmlFor="set">Weight</label>
        <input
          type="number"
          name="weight"
          value={form.weight}
          onChange={handleChange}
          required
        />

        <label htmlFor="metric">Metric</label>
        <select 
          id="metric"
          value={form.metric}
          onChange={handleChange}
        >
          <option value="lb">lb</option>
          <option value="kg">kg</option>
        </select>

        <label htmlFor="note">Note</label>
        <textarea 
          id="note" 
          rows="3"
          // value={form.note}
          onChange={handleChange}
        />

        <label htmlFor="date">Date</label>
        <input
          type="date"
          name="date"
          // value={form.date}
          onChange={handleChange}
          required
        />

      

        <button type="submit" className="btn">
          Submit
        </button>
      </form>

      <p>{message}</p>
      <div>
        {Object.keys(errors).map((err, index) => (
          <li key={index}>{err}</li>
        ))}
      </div>
    </>
  )
}

export default Form
