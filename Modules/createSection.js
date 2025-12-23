const mongoose = require("mongoose");

const createSection = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم الفصل مطلوب"],
    },
    price: {
      type: Number,
      required: [true, "سعر الفصل مطلوب"],
    },
    discount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
    class: {
      type: mongoose.Schema.ObjectId,
      ref: "Class",
      required: [true, "معرف الصف مطلوب"],
    },
    // lecture: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: "Lectures",
    //   },
    // ],
  },
  { timestamps: true }
);
createSection.post("save", async function (doc, next) {
  await doc.populate([
    { path: "class", select: "name" },
    { path: "teacher", select: "name" },
  ]);
  next();
});
createSection.pre(/^find/, function (next) {
  this.populate([
    { path: "class", select: "name" },
    { path: "teacher", select: "name" },
    
  ]);
  next();
});

createSection.pre("findOneAndDelete", async function (next) {
  const sectionId = this.getQuery()._id;
  const lectures = await mongoose
    .model("Lectures")
    .find({ section: sectionId }, "_id");

  // استخراج معرفات المحاضرات
  const lectureIds = lectures.map((lecture) => lecture._id);
  await mongoose
    .model("Couress")
    .updateMany(
      { "couresItems.lacture": { $in: lectureIds } },
      { $pull: { couresItems: { lacture: { $in: lectureIds } } } }
    );
  await mongoose.model("Lectures").deleteMany({ section: sectionId });
  await mongoose.model("Coupons").deleteMany({ lecture: lectureIds });
  next();
});

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/section`)) {
    const image = `${process.env.BASE_URL}/section/${doc.image}`;
    doc.image = image;
  }
};
createSection.post("init", (doc) => {
  ImageURL(doc);
});
createSection.post("save", (doc) => {
  ImageURL(doc);
});
const createSectionModel = mongoose.model("Section", createSection);
module.exports = createSectionModel;
