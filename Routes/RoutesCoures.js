const express = require("express");
const {
  protect,
  allowedTo,
  getLoggedUserData,
} = require("../Service/AuthService");
const {
  createCoures,
  getCoures,
  deleteSpecificCourseItem,
  updateCourseTime,
} = require("../Service/CouresService");
const { createCourseValidator } = require("../Resuble/CouressValidationError");

const Routes = express.Router();
Routes.use(protect);
Routes.route("/coures/")
  .post(allowedTo("user"), createCourseValidator, createCoures)
  .get(allowedTo("user"), getCoures);
Routes.route("/coures/time/:id/:mediaId").put(
  allowedTo("user"),
  updateCourseTime
);

Routes.route("/coures/:id").delete(deleteSpecificCourseItem);
// .put(updateSpecificCourseItemSeen);

module.exports = Routes;
