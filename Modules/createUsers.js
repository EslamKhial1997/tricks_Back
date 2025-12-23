const mongoose = require("mongoose");

const createUsers = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Required Name User"],
    },
    slug: {
      type: String,
    },
    address: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Required E-mail User"],
      trim: true,
      unique: [true, "E-mail Must Be Unique"],
    },
    password: {
      type: String,
      minlength: [6, "Password Too Short To Create"],
    },

    phone: { type: String, sparse: true, default: null, required: false },
    image: {
      type: String,
    },
    wallet: {
      type: Number,
    },
    point: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ["user", "admin", "manager"],
      default: "user",
    },

    grade: {
      type: String,
      enum: ["first", "second", "third"],
    },

    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "Teachers",
      required: function () {
        return this.role === "admin";
      },
    },
    active: {
      type: Boolean,
      default: true,
    },

    guardianPhone: {
      type: String,
    },
    verificationToken: String,
    googleId: { type: String, unique: true, sparse: true },
    groupToken: String,
  },
  { timestamps: true }
);
const ImageURL = (doc) => {
  if (
    doc.image &&
    !doc.image.includes(`${process.env.BASE_URL}/admin`) &&
    !doc.image.includes("https://lh3.googleusercontent.com")
  ) {
    const image = `${process.env.BASE_URL}/admin/${doc.image}`;
    doc.image = image;
  }
};
createUsers.post("init", (doc) => {
  ImageURL(doc);
});
createUsers.post("save", (doc) => {
  ImageURL(doc);
});
const createUsersModel = mongoose.model("Users", createUsers);
module.exports = createUsersModel;
