const mongoose = require("mongoose");

const createCoupons = new mongoose.Schema(
  {
    code: String,
   
    seen: {
      type: Number,
      require: [true, "عدد المشاهدات مطلوب"],
    },
    createdBy: String,
    discount: {
      type: Number,
      default: 0,
    },
    expires: {
      type: Date,
    },

    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "Teacher ID Is Required"],
    },
    lecture: {
      type: mongoose.Schema.ObjectId,
      ref: "Lectures",
    },
    section: {
        type: mongoose.Schema.ObjectId,
        ref: "Section",
    },

    locked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// دمج الـ populate في pre hook واحد لتقليل التكرار
createCoupons.pre(/^find/, function (next) {
  this.populate([
    { path: "lecture", select: "lecture price description" },
    { path: "section", select: "name price image" },
    { path: "teacher", select: "name" },
  ]);
  next();
});

createCoupons.post("save", async function (doc, next) {
  await doc.populate([
    { path: "lecture", select: "lecture price description" },
    { path: "section", select: "name price image" },
    { path: "teacher", select: "name" },
  ]);
  next();
});

createCoupons.index({ expires: 1 }, { expireAfterSeconds: 0 });

const createCouponsModel = mongoose.model("Coupons", createCoupons);
module.exports = createCouponsModel;
