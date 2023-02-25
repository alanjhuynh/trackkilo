import dbConnect from '../../../lib/dbConnect';
import Lift from '../../../models/Lift';
import Set from '../../../models/Set';
import { each } from 'lodash';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  const { method } = req

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const session = await getSession({req})
        if (session.userId != req.body){
          res.status(400).json({success: false});
          return;
        }
        const lifts = await Lift.find({}) /* find all the data in our database */
        res.status(200).json({ success: true, data: lifts })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const session = await getSession({req})
        if (session.userId != req.body.liftForm.userId){
          res.status(400).json({success: false});
          return;
        }

        const lift = await Lift.create(
          req.body.liftForm
        ) /* create a new model in the database */
        let sets = {};
        await each (req.body.setForm, (set) => {
          if (session.userId != set.userId)
            return; //continue

          set.liftId = lift._id;
          let targetSet = Set.create(set);
          sets[targetSet.index] = targetSet;
        })
        res.status(201).json({ success: true, data: {lift, sets} })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
