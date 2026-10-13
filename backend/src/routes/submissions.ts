import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Campaign from '../models/Campaign';
import Submission from '../models/Submission';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { calculateAdditionalPayout } from '../services/payout';

const router = Router();
const createSchema = z.object({ campaignId: z.string().regex(/^[a-f\d]{24}$/i), postUrl: z.string().url().max(500) });
const viewsSchema = z.object({ views: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });

router.post('/', requireAuth, requireRole('creator'), asyncHandler(async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Provide a valid campaign ID and post URL' }); return; }
  const campaign = await Campaign.findOne({ _id: parsed.data.campaignId, status: 'active' });
  if (!campaign) { res.status(404).json({ message: 'Active campaign not found' }); return; }
  try {
    const submission = await Submission.create({ campaignId: campaign.id, creatorId: req.user!.id, postUrl: parsed.data.postUrl });
    res.status(201).json({ submission });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) { res.status(409).json({ message: 'This post has already been submitted to this campaign' }); return; }
    throw error;
  }
}));

router.get('/mine', requireAuth, requireRole('creator'), asyncHandler(async (req: AuthRequest, res) => {
  const submissions = await Submission.find({ creatorId: req.user!.id }).populate('campaignId', 'name platform budget spent milestones').sort({ createdAt: -1 }).lean();
  res.json({ submissions, totalEarnings: submissions.reduce((sum, s) => sum + s.payoutAllocated, 0) });
}));

// The assignment explicitly allows this simulated platform-data endpoint without a role check.
// It still validates input and uses a transaction for the budget/submission changes.
router.patch('/:id/views', asyncHandler(async (req, res) => {
  const parsed = viewsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Views must be a non-negative whole number' }); return; }
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ message: 'Invalid submission ID' }); return; }

  const session = await mongoose.startSession();
  let response: Record<string, unknown> | undefined;
  try {
    await session.withTransaction(async () => {
      const submission = await Submission.findById(req.params.id).session(session);
      if (!submission) { const error = new Error('Submission not found'); (error as Error & { status?: number }).status = 404; throw error; }
      if (parsed.data.views < submission.views) { const error = new Error('View count cannot decrease'); (error as Error & { status?: number }).status = 400; throw error; }
      const campaign = await Campaign.findById(submission.campaignId).session(session);
      if (!campaign) { const error = new Error('Campaign not found'); (error as Error & { status?: number }).status = 404; throw error; }

      const additional = calculateAdditionalPayout(parsed.data.views, campaign.milestones, submission.payoutAllocated);
      if (additional === 0) {
        submission.views = parsed.data.views;
        await submission.save({ session });
        response = { submission, allocatedNow: 0, remainingBudget: campaign.budget - campaign.spent };
        return;
      }

      // Conditional update is a second line of defense against overspending.
      const reservation = await Campaign.updateOne(
        { _id: campaign._id, $expr: { $lte: [{ $add: ['$spent', additional] }, '$budget'] } },
        { $inc: { spent: additional } }, { session }
      );
      if (reservation.modifiedCount !== 1) {
        submission.views = parsed.data.views;
        submission.status = 'budget_exhausted';
        await submission.save({ session });
        response = { submission, allocatedNow: 0, remainingBudget: Math.max(0, campaign.budget - campaign.spent), message: 'Milestone reached, but the campaign budget cannot cover the full payout increment' };
        return;
      }
      submission.views = parsed.data.views;
      submission.payoutAllocated += additional;
      submission.status = 'active';
      await submission.save({ session });
      const newSpent = campaign.spent + additional;
      if (newSpent >= campaign.budget) await Campaign.updateOne({ _id: campaign._id }, { $set: { status: 'completed' } }, { session });
      response = { submission, allocatedNow: additional, remainingBudget: campaign.budget - newSpent };
    });
  } finally { await session.endSession(); }
  res.json(response);
}));
export default router;
