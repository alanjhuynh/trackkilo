import dbConnect from '../../../lib/dbConnect'
import Lift from '../../../models/Lift'

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req

  await dbConnect()

  switch (method) {
    case 'GET' /* Get a model by its ID */:
      try {
        const lift = await Lift.findById(id)
        if (!lift) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: lift })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'PUT' /* Edit a model by its ID */:
      try {
        const lift = await Lift.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        })
        if (!lift) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: lift })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE' /* Delete a model by its ID */:
      try {
        const deletedLift = await Lift.deleteOne({ _id: id })
        if (!deletedLift) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: {} })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    default:
      res.status(400).json({ success: false })
      break
  }
}
