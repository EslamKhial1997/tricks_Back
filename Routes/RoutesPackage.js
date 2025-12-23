const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");
const { UtilsValidator } = require("../Resuble/UtilsValidationError");
const {
  getPackages,
  updatePackage,
  createPackage,
} = require("../Service/PackageService");
const { createPackageValidator } = require("../Resuble/PackageValidationError");
const { deletePackage } = require("../Service/PackageService");
const { getPackage } = require("../Service/PackageService");
const { updateMiddleware } = require("../Service/Middleware");
const createPackageModel = require("../Modules/createPackage");
const Routes = Router();
Routes.use(protect);
Routes.route("/package/")
  .post(allowedTo("manager"), createPackageValidator, createPackage)
  .get(allowedTo("teacher", "admin", "manager"), getPackages);
Routes.route("/package/:id")
  .get(
    allowedTo("teacher", "admin", "manager"),
    updateMiddleware(createPackageModel),
    UtilsValidator,
    getPackage
  )
  .put(allowedTo("manager"), UtilsValidator, updatePackage)
  .delete(allowedTo("manager"), UtilsValidator, deletePackage);
module.exports = Routes;
