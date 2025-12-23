const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
      require: [true, "معرف الطالب مطلوب"],
    },
    correctAnswer: Number, // الإجابة الصحيحة
    image: String,
    correctText: String,
  },
  { timestamps: true }
);
const createAnswersModel = mongoose.model("Answers", answerSchema);
module.exports = createAnswersModel;
