const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");

const {
  createCenter,
  getCenters,
  getCenter,
  updateCenter,
  deleteCenter,
  getMyCenters,
} = require("../Service/CenterService");
const { createMiddleware, updateMiddleware } = require("../Service/Middleware");
const createCenterModel = require("../Modules/createCenter");
const Routes = Router();

Routes.route("/center/").post(
  protect,
  allowedTo("admin", "teacher"),
  createMiddleware,
  createCenter
);
Routes.route("/center/my").get(
  allowedTo("admin", "teacher"),
  createMiddleware,
  getMyCenters
);
Routes.route("/center/:id")
  .get(getCenter)
  .put(
    protect,
    allowedTo("admin", "teacher"),
    updateMiddleware(createCenterModel),
    updateCenter
  )
  .delete(
    protect,
    allowedTo("teacher"),
    updateMiddleware(createCenterModel),
    deleteCenter
  );
module.exports = Routes;
