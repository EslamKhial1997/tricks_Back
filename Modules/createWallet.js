const mongoose = require("mongoose");

const createWallet = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teachers",
      required: [true, "Wallet must belong to a teacher"],
    },
    number: {
      type: String,
      required: [true, "Wallet number is required"],
      trim: true,
    },
    provider: {
      type: String,
      default: "Cash", // Vodafone Cash, Orange Cash, etc.
    },
    description: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const createWalletModel = mongoose.model("Wallet", createWallet);
module.exports = createWalletModel;
