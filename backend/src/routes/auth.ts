import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const signupSchema = z.object({ name: z.string().trim().min(1).max(80), email: z.string().email(), password: z.string().min(8), role: z.enum(['brand', 'creator']) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function issueToken(user: { _id: unknown; role: string }) {
  return jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
}

router.post('/signup', asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Invalid signup details', errors: parsed.error.flatten() }); return; }
  const { name, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) { res.status(409).json({ message: 'An account with this email already exists' }); return; }
  const user = await User.create({ name, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), role });
  res.status(201).json({ token: issueToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Enter a valid email and password' }); return; }
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) { res.status(401).json({ message: 'Incorrect email or password' }); return; }
  res.json({ token: issueToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}));
export default router;
