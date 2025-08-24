import mongoose from 'mongoose';

// A sub-schema for the coding challenge itself.
// This mirrors the structure of the CodingChallenge type on the frontend.
const CodingChallengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    starterCode: { type: String, required: true },
    // testCase is a flexible object. Using Mongoose's generic Object type is simplest here.
    testCase: { type: Object, required: true }
}, { _id: false }); // _id: false because this is a sub-document

// A sub-schema for the user's solution.
const SolutionSchema = new mongoose.Schema({
    language: { type: String, required: true },
    code: { type: String, required: true },
}, { _id: false });


const SolvedCodingProblemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  challenge: {
      type: CodingChallengeSchema,
      required: true
  },
  solution: {
      type: SolutionSchema,
      required: true
  },
  difficulty: { type: String, required: true },
  solvedAt: { type: Date, default: Date.now },
}, {
  collection: 'solvedcodingproblems' // Explicitly set collection name
});

// Create an index on user and solvedAt for efficient querying of history.
SolvedCodingProblemSchema.index({ user: 1, solvedAt: -1 });

export default mongoose.model('SolvedCodingProblem', SolvedCodingProblemSchema);