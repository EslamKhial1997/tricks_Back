const mongoose = require("mongoose");

const ResulteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },

    startedAt: Date,
    durationMs: Number,
    endsAt: Date,
    finishedAt: Date,
    sealed: { type: Boolean, default: false },

    items: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        userAnswer: Number,
        isCorrect: Boolean,
        correctAnswer: Number,
        correctText: String,
        userAnswerText: String,
        teacherCorrectAnswer: String,
      },
    ],
  },
  { timestamps: true }
);
ResulteSchema.pre(/^find/, function (next) {
  this.populate([{ path: "quiz", select: "text teacher" }, { path: "items.question" }]);
  next();
});
const createResultsModel = mongoose.model("Results", ResulteSchema);
module.exports = createResultsModel;
