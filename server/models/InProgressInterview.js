import mongoose from 'mongoose';

const InProgressInterviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // A user can only have one interview in progress at a time
  },
  role: { type: String, required: true },
  persona: { type: String, required: true },
  difficulty: { type: String, required: true },
  conversation: { type: Array, required: true },
  questionCount: { type: Number, required: true },
  codingChallenge: { type: Object, default: null },
  userCode: { type: String, default: '' },
});

export default mongoose.model('InProgressInterview', InProgressInterviewSchema);
