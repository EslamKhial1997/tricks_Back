const mongoose = require("mongoose");

const createQrCode = new mongoose.Schema(
  {
    createdBy: {
      type: String,
      required: [true, "اسم المساعد مطلوب"],
    },
    place: {
      type: mongoose.Schema.ObjectId,
      ref: "Centers",
      required: [true, "اسم المكان مطلوب"],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
      required: [true, "معرف الطالب مطلوب"],
    },

    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
    lecture: {
      type: mongoose.Schema.ObjectId,
      ref: "Lectures",
    },
  },
  { timestamps: true }
);
createQrCode.pre(/^find/, function (next) {
  this.populate({
    path: "teacher",
    select: "name",
  })
    .populate({
      path: "user",
      select: "name email phone",
    })
    .populate({
      path: "lecture",
      select: { section: 0 },
    })
    .populate({
      path: "place",
    });
  next();
});
createQrCode.post("save", async function (doc, next) {
  await doc.populate([
    { path: "teacher", select: "name" },
    { path: "user", select: "name email phone" },
    { path: "lecture", select: { section: 0 } },
    { path: "place", select: "name" },
  ]);
  next();
});
const createQrCodeModel = mongoose.model("QrCode", createQrCode);
module.exports = createQrCodeModel;
