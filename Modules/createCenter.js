const mongoose = require("mongoose");

const createCenter = new mongoose.Schema(
  {
    place: {
      type: String,
      required: [true, "اسم السنتر مطلوب"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
  },
  { timestamps: true }
);
createCenter.pre(/^find/, function (next) {
  this.populate({
    path: "teacher",
    select: "name",
  });
  next();
});

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/Center`)) {
    const image = `${process.env.BASE_URL}/Center/${doc.image}`;
    doc.image = image;
  }
};
createCenter.post("init", (doc) => {
  ImageURL(doc);
});
createCenter.post("save", (doc) => {
  ImageURL(doc);
});
const createCenterModel = mongoose.model("Centers", createCenter);
module.exports = createCenterModel;
