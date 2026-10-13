import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['brand', 'creator'], required: true }
}, { timestamps: true });

export type UserDocument = InferSchemaType<typeof userSchema>;
export default model('User', userSchema);
