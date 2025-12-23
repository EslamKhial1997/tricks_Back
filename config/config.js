const mongoose = require("mongoose");

const dbCollection = () => {
  mongoose.connect(process.env.DB_URL).then(() => console.log("Connected"));
};

module.exports = dbCollection;
