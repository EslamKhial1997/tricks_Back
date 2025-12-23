const express = require("express");
const jwt = require("jsonwebtoken");
require("../config/googleAuth");
const cookieParser = require("cookie-parser");

const passport = require("passport");

const Routes = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.DB_URL, {
    expiresIn: "90d",
  });
};

Routes.use(cookieParser());
Routes.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

Routes.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),

  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect("/login");
      }

      const token = generateToken(req.user._id);
      res.cookie("access_token", token, {
        path: "/",
        httpOnly: false,
        sameSite: "Lax",
      });
      return res.redirect("/");
    } catch (err) {
      return res.redirect("/login");
    }
  }
);

module.exports = Routes;
