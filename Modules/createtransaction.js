const mongoose = require("mongoose");

const createTransaction = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
      require: [true, "معرف الطالب مطلوب"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      require: [true, "معرف المدرس مطلوب"],
    },
    lecture: {
      type: mongoose.Schema.ObjectId,
      ref: "Lectures",
      require: [true, "معرف المحاضرة مطلوب"],
    },
    type: {
      type: String,
      enum: ["lecture", "section" , "qrcode" , "youtube"],
      default: "lecture",
    },
    point: Number,
    coupon: {
      code: String,
      seen: Number,
      discount: Number,
      expires: Date,
      createdBy: String,
    },
  },
  { timestamps: true }
);

createTransaction.pre(/^find/, function (next) {
  this.populate({
    path: "lecture",
    select: "-bunny -section -video -description -pdf",
  }).populate({ path: "user", select: "name phone , email" });
  next();
});

// إنشاء النموذج
const createTransactionModel = mongoose.model(
  "Transactions",
  createTransaction
);

module.exports = createTransactionModel;
