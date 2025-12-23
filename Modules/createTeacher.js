const mongoose = require("mongoose");

const createTeachers = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Required Name "],
    },
    description: {
      type: String,
    },
    subject: {
      type: String,
    },
    slug: {
      type: String,
    }, 
    email: {
      type: String,
      required: [true, "Required E-mail "],
    },
    password: {
      type: String,
    },

    phone: {
      type: String,
      required: [true, "Required Phone "],
    },
    image: {
      type: String,
    },
    picture: {
      type: String,
    },
    avater: {
      type: String,
    },

    role: {
      type: String,
      default: "teacher",
    },
    walletNumber: {
      type: String,
      trim: true
    },
    active: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    googleId: { type: String, unique: true, sparse: true },
    groupToken: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

createTeachers.virtual("wallets", {
  ref: "Wallet",
  foreignField: "teacher",
  localField: "_id",
});

createTeachers.pre(/^find/, function (next) {
  this.populate({ path: "wallets", select: "number provider" });
  next();
});

const ImageURL = (doc) => {
  if (doc.image && !doc.image.includes(`${process.env.BASE_URL}/teacher`)) {
    const image = `${process.env.BASE_URL}/teacher/${doc.image}`;
    doc.image = image;
  }
  if (doc.picture && !doc.picture.includes(`${process.env.BASE_URL}/teacher`)) {
    const picture = `${process.env.BASE_URL}/teacher/${doc.picture}`;
    doc.picture = picture;
  }
  if (doc.avater && !doc.avater.includes(`${process.env.BASE_URL}/teacher`)) {
    const avater = `${process.env.BASE_URL}/teacher/${doc.avater}`;
    doc.avater = avater;
  }
};
createTeachers.post("init", (doc) => {
  ImageURL(doc);
});
createTeachers.post("save", (doc) => {
  ImageURL(doc);
});

const createTeachersModel = mongoose.model("Teachers", createTeachers);
module.exports = createTeachersModel;
