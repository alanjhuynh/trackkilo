import dbConnect from '../../../lib/dbConnect';
import Lift from '../../../models/Lift';
import Set from '../../../models/Set';
import { each, size } from 'lodash';
import { getServerSession } from "next-auth/next";
import { authOptions } from 'pages/api/auth/[...nextauth]';

export default async function handler(req, res) {
  const { method } = req;
  const PAGE_SIZE = 12;

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const session = await getServerSession(req, res, authOptions)
        if(!session) {
          return {
            redirect: {
              destination: '/login',
            }
          }
        }

        const { page } = req.query;

        let result = await Lift.find({userId: session.userId})
          .sort({date: -1, createdAt: -1})
          .limit(PAGE_SIZE)
          .skip(PAGE_SIZE * (page - 1))
        let lifts = result.map((doc) => {
          const lift = doc.toObject()
          lift._id = lift._id.toString()
          lift.date = lift.date.toString()
          return lift
        })

        for (let i = 0; i < lifts.length; i++){
          let result = await Set.find({
            liftId: lifts[i]._id,
            userId: session.userId,
          });
          let sets = result.map((doc) => {
            const set = doc.toObject();
            set._id = set._id.toString();
            return set;
          })

          let targetSets = {};
          each(sets, (set) => {
            targetSets[set.index] = set;
          })
          lifts[i].sets = targetSets;    
        }
        res.status(200).json({ success: true, data: lifts })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const session = await getServerSession(req, res, authOptions)
        if (session.userId != req.body.liftForm.userId){
          res.status(400).json({success: false});
          return;
        }

        const lift = await Lift.create(
          req.body.liftForm
        ) /* create a new model in the database */
        let sets = {};
        for (let i = 1; i < size(req.body.setForm) + 1; i++) {
            let set = req.body.setForm[i];
            if (session.userId != set.userId)
              continue;

            set.liftId = lift._id;
            let targetSet = await Set.create(set);
            sets[targetSet.index] = targetSet;
        }
      
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
