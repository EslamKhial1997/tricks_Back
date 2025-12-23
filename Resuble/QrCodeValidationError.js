const { check } = require("express-validator");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");
const createTeachersModel = require("../Modules/createTeacher");
const createUsersModel = require("../Modules/createUsers");
const createLecturesModel = require("../Modules/createAlecture");
const createCenterModel = require("../Modules/createCenter");

exports.createQrCodeValidator = [
  check("user")
    .isMongoId()
    .notEmpty()
    .withMessage("معرف الطالب مطلوب")
    .custom((val, { req }) => {
      return createUsersModel.findOne({ _id: val }).then((user) => {
        if (!user) {
          return Promise.reject(new Error("الطالب غير موجود"));
        }
      });
    }),
  check("lecture")
    .notEmpty()
    .isMongoId()
    .withMessage("معرف المحاضرة مطلوب")
    .custom((val, { req }) => {
      return createLecturesModel.findOne({ _id: val }).then((lecture) => {
        if (!lecture) {
          return Promise.reject(new Error("المحاضرة غير موجودة"));
        }
      });
    }),
  MiddlewareValidator,
];
exports.createQrCodeAttendanceValidator = [
  check("user")
    .isMongoId()
    .notEmpty()
    .withMessage("معرف الطالب مطلوب")
    .custom((val, { req }) => {
      return createUsersModel.findOne({ _id: val }).then((user) => {
        if (!user) {
          return Promise.reject(new Error("الطالب غير موجود"));
        }
      });
    }),
  check("place")
    .notEmpty()
    .isMongoId()
    .withMessage("معرف المكان مطلوب")
    .custom((val, { }) => {
      return createCenterModel.findOne({ _id: val }).then((lecture) => {
        
        if (!lecture) {
          return Promise.reject(new Error("المكان غير موجودة"));
        }
      });
    }),
  MiddlewareValidator,
];
exports.getQrCodeValidator = [
  check("id").isMongoId().withMessage("المعرف غير صحيح"),
  MiddlewareValidator,
];

exports.deleteQrCodeValidator = [
  check("id").isMongoId().withMessage("المعرف مطلوب"),
  MiddlewareValidator,
];
