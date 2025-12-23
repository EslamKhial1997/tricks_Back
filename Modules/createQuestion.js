const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    text: String,
    type: {
      type: String,
      enum: ["choose", "article", "correct"],
      default: "choose",
    },
    quiz: {
      type: mongoose.Schema.ObjectId,
      ref: "Quiz",
      required: [true, "معرف الاختبار مطلوب"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
    options: [String],
    correctAnswer: Number,
    image: String,
    correctText: String,
  },
  { timestamps: true }
);

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/question`)) {
    doc.image = `${process.env.BASE_URL}/question/${doc.image}`;
  }
};
questionSchema.post("init", (doc) => {
  ImageURL(doc);
});
questionSchema.post("save", (doc) => {
  ImageURL(doc);
});

const createQuestionModel = mongoose.model("Question", questionSchema);

module.exports = createQuestionModel;
