import dbConnect from '../../../lib/dbConnect';
import Lift from '../../../models/Lift';
import Set from '../../../models/Set';
import { getSession } from 'next-auth/react';
import { each, size } from 'lodash';
import mongoose from 'mongoose';

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
        const session = await getSession({req})
        if (session.userId != req.body.liftForm.userId){
          res.status(400).json({success: false});
          return;
        }

        const lift = await Lift.findByIdAndUpdate(id, req.body.liftForm, {
          new: true,
          runValidators: true,
        })
        if (!lift) {
          return res.status(400).json({ success: false })
        }
        let sets = {};
        for (let i = 1; i < size(req.body.setForm) + 1; i++) {
          let set = req.body.setForm[i];
          if (session.userId != set.userId)
            return; //continue

            if (!set._id) {
              set._id = new mongoose.mongo.ObjectId();
            }
            let targetSet = await Set.findByIdAndUpdate(set._id, set, {
              new: true,
              runValidators: true,
              upsert: true,
            });
            sets[targetSet.index] = targetSet;
        }

        //TODO: delete sets
        
        res.status(200).json({ success: true, data: {lift, sets} })
      } catch (error) {
        console.log(error);
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE' /* Delete a model by its ID */:
      try {
        //TODO: DELETE SETS TOO
        // const session = await getSession({req})
        // if (session.userId != req.body.liftForm.userId){
        //   res.status(400).json({success: false});
        //   return;
        // }
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
