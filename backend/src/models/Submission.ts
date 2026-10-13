import { Schema, model, Types } from 'mongoose';

const submissionSchema = new Schema({
  campaignId: { type: Types.ObjectId, ref: 'Campaign', required: true, index: true },
  creatorId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  postUrl: { type: String, required: true, trim: true },
  views: { type: Number, required: true, default: 0, min: 0 },
  payoutAllocated: { type: Number, required: true, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'budget_exhausted'], default: 'active' },
  flaggedForViewSpike: { type: Boolean, default: false }
}, { timestamps: true });

submissionSchema.index({ campaignId: 1, creatorId: 1, postUrl: 1 }, { unique: true });
export default model('Submission', submissionSchema);
