const mongoose = require("mongoose");

// نموذج السؤال

const quizSchema = new mongoose.Schema(
  {
    text: String,
    questions: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Question",
      },
    ],
    lecture: {
      type: mongoose.Schema.ObjectId,
      ref: "Lectures",
      required: [true, "معرف المحاضرة مطلوب"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
    timer: {
      type: Number,
    },
    type: {
      type: String,
      enum: ["choice", "truefalse"],
      default: "choice",
    },

    active: {
      type: Boolean,
      default: false, 
    },
  },
  { timestamps: true }
);
quizSchema.post("findOneAndDelete", async function (doc, next) {
  if (!doc) return next();
  const quizId = doc._id;
  try {
    await Promise.all([
      mongoose.model("Question").deleteMany({ quiz: quizId }),
      mongoose.model("Results").deleteMany({ quiz: quizId }),
      mongoose
        .model("Results")
        .updateMany(
          { "items.quiz": quizId },
          { $pull: { items: { quiz: quizId } } }
        ),
    ]);

    // امسح النتائج الفارغة
    await mongoose.model("Results").deleteMany({
      $expr: { $eq: [{ $size: "$items" }, 0] },
    });

    next();
  } catch (e) {
    next(e);
  }
});

quizSchema.pre(/^find/, function (next) {
  this.populate([{ path: "teacher", select: "name" }, { path: "lecture" }]);
  next();
});

const createQuizModel = mongoose.model("Quiz", quizSchema);
module.exports = createQuizModel;
