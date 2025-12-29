const { Router } = require("express");
const {
  createUsersValidator,
  UpdateUserPassword,
  getOneUserValidator,
  deleteOneUserValidator,
  updateOneUserValidator,
} = require("../Resuble/UsersvalidatorError");
const {
  createUsers,
  getUsers,
  updateUser,
  deleteUser,
  getUser,
  uploadImage,
  updateLoggedUserPassword,
  toggleAdminStatus,
  getUserAnalytics,
} = require("../Service/UsersService");
const {
  protect,
  allowedTo,
  getLoggedUserData,
} = require("../Service/AuthService");
const { resizeImageAuth } = require("../Utils/imagesHandler");
const createUsersModel = require("../Modules/createUsers");
const { updateMiddleware } = require("../Service/Middleware");

const Routes = Router();
Routes.use(protect);

Routes.get(
  "/users/analytics",
  allowedTo("teacher", "admin", "manager"),
  getUserAnalytics
);
Routes.get("/users/getMe", getLoggedUserData, (req, res, next) => {
  const model = req.model;
  getUser(model)(req, res, next);
});
Routes.put(
  "/users/updateMe",
  uploadImage,
  updateOneUserValidator,
  (req, res, next) => {
    resizeImageAuth(req.user.role === "teacher" ? "teacher" : "admin")(
      req,
      res,
      next
    );
  },

  getLoggedUserData,
  (req, res, next) => {
    const model = req.model;
    updateUser(model, req.user.role === "teacher" ? "teacher" : "admin")(
      req,
      res,
      next
    );
  }
);
Routes.put(
  "/users/changeUserPassword",
  getLoggedUserData,
  UpdateUserPassword,
  (req, res, next) => {
    const model = req.model;
    updateLoggedUserPassword(model)(req, res, next);
  }
);

Routes.route("/users/")
  .post(
    allowedTo("teacher"),
    uploadImage,
    createUsersValidator,
    resizeImageAuth("admin"),
    createUsers
  )
  .get(allowedTo("manager", "teacher"), getUsers);
Routes.put(
  "/users/toggleAdminStatus/:id",
  protect,
  allowedTo("teacher"),
  toggleAdminStatus
);
Routes.route("/users/:id")
  .get(
    allowedTo("teacher", "manager", "admin"),
    getOneUserValidator,
    getUser(createUsersModel)
  )
  .delete(
    allowedTo("manager", "teacher"),
    updateMiddleware(createUsersModel),
    deleteOneUserValidator,
    deleteUser
  )
  .put(
    allowedTo("manager", "teacher"),
    updateMiddleware(createUsersModel),
    uploadImage,
    updateOneUserValidator,
    resizeImageAuth("admin"),
    updateUser(createUsersModel, "admin")
  );
module.exports = Routes;
