import { Schema, model, Types } from 'mongoose';

const milestoneSchema = new Schema({
  views: { type: Number, required: true, min: 1 },
  payout: { type: Number, required: true, min: 0 }
}, { _id: false });

const campaignSchema = new Schema({
  brandId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  platform: { type: String, enum: ['instagram', 'youtube'], required: true },
  budget: { type: Number, required: true, min: 1 },
  spent: { type: Number, required: true, default: 0, min: 0 },
  milestones: { type: [milestoneSchema], required: true },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' }
}, { timestamps: true });

campaignSchema.index({ status: 1, createdAt: -1 });
export default model('Campaign', campaignSchema);
