const { Router } = require("express");

const { updateLoggedUserPassword } = require("../Service/UsersService");
const { protect, allowedTo, restCodeSent, getLoggedUserData } = require("../Service/AuthService");
const {
  createTeachers,
  UploadImageService,
  resizeImage,
  getTeachers,
  deleteTeacher,
  updateTeacher,
  getAllDataTeacher,
  updateSpecificPaid,
  toggleTeacherStatus,
  getAllDataTeachers,
  updateWalletNumber,
} = require("../Service/TeachersService");
const {
  createTeachersValidator,
  deleteOneTeacherValidator,
  updateTeacherValidator,
  UpdatePaidTeacherValidation,
} = require("../Resuble/TeachersvalidatorError");
const {
  UpdateTeacherPassword,
  getOneUserValidator,
} = require("../Resuble/UsersvalidatorError");
const Routes = Router();
Routes.put(
  "/teacher/changeTeacherPassword",
  protect,
  getLoggedUserData,
  UpdateTeacherPassword,
  (req, res, next) => {
    const model = req.model;
    updateLoggedUserPassword(model)(req, res, next);
  }
);
Routes.route("/teacher/")
  .post(
    protect,
    allowedTo("manager"),
    UploadImageService,
    createTeachersValidator,
    resizeImage,
    createTeachers
  )
  .get(getTeachers);
Routes.post("/teacher/restCode", restCodeSent);
Routes.get("/teacher/details", getAllDataTeachers);
Routes.put(
  "/teacher/toggleTeacherStatus/:id",
  protect,
  allowedTo("manager"),
  toggleTeacherStatus
);
Routes.route("/teacher/:id")
  .get(getOneUserValidator, getAllDataTeacher)
  .delete(
    protect,
    allowedTo("manager"),
    deleteOneTeacherValidator,
    deleteTeacher
  )
  .put(
    protect,
    allowedTo("manager"),
    UploadImageService,
    resizeImage,
    updateTeacherValidator,
    updateTeacher
  );
Routes.route("/teacher/paid/:id").put(
  protect,
  allowedTo("teacher"),
  UpdatePaidTeacherValidation,
  updateSpecificPaid
);


Routes.put(
  "/teacher/wallet",
  protect,
  allowedTo("teacher"),
  updateWalletNumber
);

module.exports = Routes;
