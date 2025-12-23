const mongoose = require("mongoose");

const createPackage = new mongoose.Schema(
  {
    libraryID: { type: Number, required: [true, "معرف المكتبة مطلوب"] },
    apiKey: { type: String, required: [true, "رقم المعرف مطلوب"] },
    hostname: { type: String, required: [true, "رقم المعرف مطلوب"] },
    usedStorage: { type: Number, default: 0 },
    usedTraffic: {
      type: Number,
      default: 0,
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      require: [true, "معرف المدرس مطلوب"],
    },
  },
  { timestamps: true }
);
createPackage.pre(/^find/, function (next) {
  this.populate({
    path: "teacher",
    select: "name image",
  });
  next();
});
const createPackageModel = mongoose.model("Package", createPackage);
module.exports = createPackageModel;
