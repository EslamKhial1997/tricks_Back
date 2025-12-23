const mongoose = require("mongoose");

const createTransferSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Transfer must belong to a student"],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teachers",
      required: [true, "Transfer must be sent to a teacher"],
    },
    image: {
      type: String,
      required: [true, "Transfer image is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    amount: {
      type: Number,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/transfer`)) {
    const image = `${process.env.BASE_URL}/transfer/${doc.image}`;
    doc.image = image;
  }
};

createTransferSchema.post("init", (doc) => {
  ImageURL(doc);
});
createTransferSchema.post("save", (doc) => {
  ImageURL(doc);
});

module.exports = mongoose.model("Transfer", createTransferSchema);
