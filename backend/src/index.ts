import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './db';
import authRouter from './routes/auth';
import checklistsRouter from './routes/checklists';
import accountantRouter from './routes/accountant';
import sendListRouter from './routes/sendList';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/checklists', checklistsRouter);
app.use('/api/accountant', accountantRouter);
app.use('/api/send-list', sendListRouter);

const PORT = parseInt(process.env.PORT || '4000');

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
