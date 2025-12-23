const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["pdf", "youtube", "external", "exam"],
    },
    pdf: { type: String },
    linkYoutube: { type: String },
    duration: { type: Number },
    seen: { type: Number, default: 5 },
    idVideo: { type: String },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
    },

    video: {
      type: Boolean,
      default: undefined,
    },
  },
  {
    _id: true,
  }
);

const createLectures = new mongoose.Schema(
  {
    lecture: {
      type: String,
      required: [true, "اسم المحاضرة مطلوب"],
    },
    price: {
      type: Number,
      default: 0,
      required: [true, "سعر المحاضرة مطلوب"],
    },

    media: [mediaSchema],

    description: {
      type: String,
    },

    section: {
      type: mongoose.Schema.ObjectId,
      ref: "Section",
      required: [true, "معرف الفصل مطلوب"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
  },
  { timestamps: true }
);

createLectures.pre(/^find/, function (next) {
  this.populate([
    {
      path: "section",
      select: "name image",
    },
    { path: "teacher", select: "name" },
    { path: "media.quizId" },
  ]);

  next();
});
createLectures.post("save", async function (doc, next) {
  await doc.populate([
    { path: "section", select: "name image" },
    { path: "teacher", select: "name" },
  ]);
  next();
});

createLectures.pre("findOneAndDelete", async function (next) {
  try {
    const lectureId = this.getQuery()._id;
    const session = this.mongooseOptions?.().session || null;

    const Couress = mongoose.model("Couress");
    const Coupons = mongoose.model("Coupons");
    const Quiz = mongoose.model("Quiz");
    const QrCode = mongoose.model("QrCode");
    const Question = mongoose.model("Question");
    const Result = mongoose.model("Results");

    const quizzes = await Quiz.find({ lecture: lectureId }, { _id: 1 })
      .session?.(session)
      .lean();
    const quizIds = quizzes.map((q) => q._id);

    await Promise.all([
      Couress.updateMany(
        { "couresItems.lacture": lectureId },
        { $pull: { couresItems: { lacture: lectureId } } }
      ).session?.(session),

      Coupons.deleteMany({ lecture: lectureId }).session?.(session),
      QrCode.deleteMany({ lecture: lectureId }).session?.(session),

      quizIds.length
        ? Question.deleteMany({ quiz: { $in: quizIds } }).session?.(session)
        : Promise.resolve(),

      quizIds.length
        ? Result.deleteMany({ quiz: { $in: quizIds } }).session?.(session)
        : Promise.resolve(),

      quizIds.length
        ? Result.updateMany(
            { "items.quiz": { $in: quizIds } },
            { $pull: { items: { quiz: { $in: quizIds } } } }
          ).session?.(session)
        : Promise.resolve(),

      quizIds.length
        ? Result.updateMany(
            { "items.quiz._id": { $in: quizIds } },
            { $pull: { items: { "quiz._id": { $in: quizIds } } } }
          ).session?.(session)
        : Promise.resolve(),
    ]);

    await Result.deleteMany({
      $expr: { $eq: [{ $size: "$items" }, 0] },
    }).session?.(session);

    if (quizIds.length) {
      await Quiz.deleteMany({ _id: { $in: quizIds } }).session?.(session);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const ImageURL = (doc) => {
  doc.media.forEach((item) => {
    if (item.pdf && !item.pdf.includes(`${process.env.BASE_URL}/lecture`)) {
      item.pdf = `${process.env.BASE_URL}/lecture/${item.pdf}`;
    }
  });
};

createLectures.post("init", (doc) => {
  ImageURL(doc);
});
createLectures.post("save", (doc) => {
  ImageURL(doc);
});
const createLecturesModel = mongoose.model("Lectures", createLectures);
module.exports = createLecturesModel;
