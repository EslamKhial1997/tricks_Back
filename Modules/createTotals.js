const mongoose = require("mongoose");

const createTotals = new mongoose.Schema(
  {
    totalCouponsPrinted: Number,
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: [true, "معرف المدرس مطلوب"],
    },
  },
  { timestamps: true }
);

const createTotalsModel = mongoose.model("Totals", createTotals);
module.exports = createTotalsModel;
