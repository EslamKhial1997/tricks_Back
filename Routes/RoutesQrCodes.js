const { Router } = require("express");

const {
  protect,
  allowedTo,
  getLoggedUserData,
} = require("../Service/AuthService");
const {
  createCourseByQrCode,
  getQrCodes,
  getQrCode,
  createQrCodeAttendance,
  deleteQrCode,
  getMyQrCode,
  updateQrCode,
} = require("../Service/QrCodeService");
const { createMiddleware, updateMiddleware } = require("../Service/Middleware");
const {
  createQrCodeValidator,
  createQrCodeAttendanceValidator,
  getQrCodeValidator,
} = require("../Resuble/QrCodeValidationError");
const createQrCodeModel = require("../Modules/createQrCode");

const Routes = Router();
Routes.use(protect);
Routes.route("/qrcode/")
  .post(
    allowedTo("admin", "teacher"),
    createQrCodeValidator,
    createMiddleware,
    createCourseByQrCode
  )
  .get(getQrCodes);
Routes.route("/qrcode/my").get(createMiddleware, getMyQrCode);
Routes.route("/qrcode/attendance").post(
  createQrCodeAttendanceValidator,
  createMiddleware,
  createQrCodeAttendance
);
Routes.route("/qrcode/:id")
  .get(getQrCodeValidator, getQrCode).put(getQrCodeValidator,updateQrCode)
  .delete(
    protect,
    allowedTo("teacher"),
    updateMiddleware(createQrCodeModel),
    createMiddleware,
    deleteQrCode
  );
module.exports = Routes;
