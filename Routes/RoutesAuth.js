const { Router } = require("express");

const { LoginValidator } = require("../Resuble/AuthvalidatorError");
const {
  SingUp,
  Login,
  forgetPassword,
  restCodeSent,
  restNewPassword,
  resendCodeVerify,
  protect,
} = require("../Service/AuthService");

const { createUsersValidator } = require("../Resuble/UsersvalidatorError");
const { uploadImage, resizeImageAuth } = require("../Utils/imagesHandler");
// const { limiter } = require("../Service/FactoryHandler");

const Routes = Router();

Routes.route("/auth/signup").post(
  uploadImage,
  createUsersValidator,
  resizeImageAuth("admin"),
  SingUp
);

Routes.route("/auth/login").post(LoginValidator, Login);
Routes.route("/auth/resendVerifycode").post(protect, resendCodeVerify);
Routes.post("/auth/forgetPassword", forgetPassword);
Routes.post("/auth/restCode", restCodeSent);
Routes.put("/auth/setNewPassword/:id", restNewPassword("password"));

module.exports = Routes;
