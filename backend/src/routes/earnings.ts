import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import Submission from '../models/Submission';
import { asyncHandler } from '../utils/asyncHandler';
const router = Router();
router.get('/', requireAuth, requireRole('creator'), asyncHandler(async (req: AuthRequest, res) => {
  const result = await Submission.aggregate([
    { $match: { creatorId: new Types.ObjectId(req.user!.id) } },
    { $group: { _id: null, totalEarnings: { $sum: '$payoutAllocated' }, totalViews: { $sum: '$views' }, submissionsCount: { $sum: 1 } } }
  ]);
  res.json(result[0] ?? { totalEarnings: 0, totalViews: 0, submissionsCount: 0 });
}));
export default router;
