import { Schema, model } from 'mongoose';

interface IUser {
  email: string;
  passwordHash: string;
  role: 'operations' | 'accountant';
}

const schema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['operations', 'accountant'], default: 'operations' },
}, { timestamps: true });

export default model<IUser>('User', schema);
