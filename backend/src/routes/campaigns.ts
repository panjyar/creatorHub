import { Router } from 'express';
import { z } from 'zod';
import Campaign from '../models/Campaign';
import Submission from '../models/Submission';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { validateMilestones } from '../services/payout';

const router = Router();
const campaignSchema = z.object({
  name: z.string().trim().min(2).max(120), platform: z.enum(['instagram', 'youtube']),
  budget: z.number().finite().positive(),
  milestones: z.array(z.object({ views: z.number(), payout: z.number().finite().nonnegative() })).min(1)
});
router.use(requireAuth);

router.post('/', requireRole('brand'), asyncHandler(async (req: AuthRequest, res) => {
  const parsed = campaignSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Invalid campaign details', errors: parsed.error.flatten() }); return; }
  const milestoneError = validateMilestones(parsed.data.milestones);
  if (milestoneError) { res.status(400).json({ message: milestoneError }); return; }
  if (parsed.data.milestones.some((m) => m.payout > parsed.data.budget)) { res.status(400).json({ message: 'A milestone payout cannot exceed the campaign budget' }); return; }
  const campaign = await Campaign.create({ ...parsed.data, brandId: req.user!.id });
  res.status(201).json({ campaign });
}));

router.get('/mine', requireRole('brand'), asyncHandler(async (req: AuthRequest, res) => {
  const campaigns = await Campaign.find({ brandId: req.user!.id }).sort({ createdAt: -1 }).lean();
  res.json({ campaigns: await Promise.all(campaigns.map(async (c) => ({ ...c, remaining: c.budget - c.spent, submissionCount: await Submission.countDocuments({ campaignId: c._id }) }))) });
}));

router.get('/', asyncHandler(async (_req, res) => {
  const campaigns = await Campaign.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
  res.json({ campaigns: campaigns.map((c) => ({ ...c, remaining: c.budget - c.spent })) });
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const campaign = await Campaign.findById(req.params.id).lean();
  if (!campaign) { res.status(404).json({ message: 'Campaign not found' }); return; }
  if (req.user!.role === 'brand' && String(campaign.brandId) !== req.user!.id) { res.status(403).json({ message: 'You cannot access this campaign' }); return; }
  const submissions = await Submission.find({ campaignId: campaign._id }).populate('creatorId', 'name').lean();
  res.json({ campaign: { ...campaign, remaining: campaign.budget - campaign.spent }, submissions });
}));
export default router;
