import dbConnect from '../../../lib/dbConnect'
import Lift from '../../../models/Lift'

export default async function handler(req, res) {
  const { method } = req

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const lifts = await Lift.find({}) /* find all the data in our database */
        res.status(200).json({ success: true, data: lifts })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const lift = await Lift.create(
          req.body
        ) /* create a new model in the database */
        res.status(201).json({ success: true, data: lift })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
