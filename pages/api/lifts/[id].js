import dbConnect from '../../../lib/dbConnect';
import Lift from '../../../models/Lift';
import Set from '../../../models/Set';
import { getServerSession } from "next-auth/next";
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { each, size } from 'lodash';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req

  await dbConnect()

  switch (method) {
    // case 'GET' /* Get a model by its ID */:
    //   try {
    //     const lift = await Lift.findById(id)
    //     if (!lift) {
    //       return res.status(400).json({ success: false })
    //     }
    //     res.status(200).json({ success: true, data: lift })
    //   } catch (error) {
    //     res.status(400).json({ success: false })
    //   }
    //   break

    case 'PUT' /* Edit a model by its ID */:
      try {
        const session = await getServerSession(req, res, authOptions)
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
        let setIndexes = [];
        for (let i = 1; i < size(req.body.setForm) + 1; i++) {
          let set = req.body.setForm[i];
          if (session.userId != set.userId)
            continue;

            if (!set._id) {
              set._id = new mongoose.mongo.ObjectId();
            }
            let targetSet = await Set.findByIdAndUpdate(set._id, set, {
              new: true,
              runValidators: true,
              upsert: true,
            });
            sets[targetSet.index] = targetSet;
            setIndexes.push(targetSet.index);
        }

        await Set.deleteMany({liftId: id, index: {"$nin": setIndexes}});
        
        res.status(200).json({ success: true, data: {lift, sets} })
      } catch (error) {
        console.log(error);
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE' /* Delete a model by its ID */:
      try {
        const session = await getServerSession(req, res, authOptions)
        if (session.userId != req.body){
          res.status(400).json({success: false});
          return;
        }
        const deletedLift = await Lift.deleteOne({ _id: id });
        if (!deletedLift) {
          return res.status(400).json({ success: false })
        }
        await Set.deleteMany({liftId: id});
        res.status(200).json({ success: true, id})
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    default:
      res.status(400).json({ success: false })
      break
  }
}
