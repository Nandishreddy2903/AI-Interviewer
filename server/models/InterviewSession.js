import mongoose from 'mongoose';

const QuestionFeedbackSchema = new mongoose.Schema({
    question: String,
    answer: String,
    feedback: String,
    score: Number,
}, { _id: false });

const InterviewFeedbackSchema = new mongoose.Schema({
    overallFeedback: String,
    overallScore: Number,
    questionFeedback: [QuestionFeedbackSchema],
}, { _id: false });

const InterviewSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: { type: String, required: true },
  persona: { type: String, required: true },
  difficulty: { type: String, required: true },
  date: { type: String, required: true },
  feedback: { type: InterviewFeedbackSchema, required: true },
});

export default mongoose.model('InterviewSession', InterviewSessionSchema);
