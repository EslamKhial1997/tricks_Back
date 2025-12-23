const { check, body } = require("express-validator");
const { default: slugify } = require("slugify");
const bcrypt = require("bcryptjs");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");
const createUsersModel = require("../Modules/createUsers");
const createTeachersModel = require("../Modules/createTeacher");
const ApiError = require("./ApiErrors");

exports.createUsersValidator = [
  check("name")
    .notEmpty()
    .withMessage("is required Name")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("password")
    .notEmpty()
    .withMessage("is required Password")
    .withMessage("To Shoort Password To CreateUser Validator"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("To Shoort Password To CreateUser Validator")
    .custom((val, { req }) => {
      if (val !== req.body.passwordConfirm) {
        return Promise.reject(new Error("Confirm Password No Match"));
      }
      return true;
    }),
  check("passwordConfirm")
    .notEmpty()
    .withMessage("Password confirmation required"),

  check("email").notEmpty().withMessage("is required E-mail"),
  check("email")
    .isEmail()
    .withMessage("Must be at E-mail Address")
    .custom((val) =>
      createUsersModel.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("ايميل المستخدم موجود بالفعل"));
        }
      })
    ),
  check("email")
    .isEmail()
    .withMessage("Must be at E-mail Address")
    .custom((val) =>
      createTeachersModel.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("ايميل المستخدم موجود بالفعل"));
        }
      })
    ),

  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invailable phone number EG , SA Number Only accepted")
    .custom((val) =>
      createUsersModel.findOne({ phone: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("رقم الموبايل مستخدم"));
        }
      })
    ),
  MiddlewareValidator,
];

exports.getOneUserValidator = [
  check("id").isMongoId().withMessage("لايوجد بيانات لهذا المستخدم"),
  MiddlewareValidator,
];
exports.deleteOneUserValidator = [
  check("id").isMongoId().withMessage("لا"),
  MiddlewareValidator,
];
exports.updateOneUserValidator = [
  check("email")
    .isEmail()
    .optional()
    .withMessage("Must be at E-mail Address")
    .custom((val) =>
      createUsersModel.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("ايميل المستخدم موجود بالفعل"));
        }
      })
    ),
  check("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invailable phone number EG , SA Number Only accepted")
    .custom((val) =>
      createUsersModel.findOne({ phone: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("رقم الموبايل مستخدم"));
        }
      })
    ),
  MiddlewareValidator,
];
exports.deleteOneUserValidator = [
  check("id").isMongoId().withMessage("لايوجد بيانات لهذا المستخدم"),
  MiddlewareValidator,
];
exports.UpdateUserPassword = [
  check("currentPasword")
    .notEmpty()
    .withMessage("you Must enter Old password "),
  check("passwordConfirm")
    .notEmpty()
    .withMessage("you Must enter belong password "),
  check("password")
    .notEmpty()
    .withMessage("you Must enter password ")
    .custom(async (val, { req }) => {
      const user = await createUsersModel.findById(req.params.id);

      if (!user) {
        throw new ApiError("المستخدم غير موجود", 404);
      }
      const iscorrectPassword = await bcrypt.compare(
        req.body.currentPasword,
        user.password
      );
      if (!iscorrectPassword) {
        throw new ApiError("الباسورد القديم غير صحيح", 401);
      }
      if (val !== req.body.passwordConfirm) {
        throw new ApiError("in Correct passwordConfirm", 401);
      }
    }),
  MiddlewareValidator,
];
exports.UpdateTeacherPassword = [
  check("currentPasword")
    .notEmpty()
    .withMessage("you Must enter Old password "),
  check("passwordConfirm")
    .notEmpty()
    .withMessage("you Must enter belong password "),
  check("password")
    .notEmpty()
    .withMessage("you Must enter password ")
    .custom(async (val, { req }) => {
      const user = await createTeachersModel.findById(req.params.id);

      if (!user) {
        throw new ApiError("المستخدم غير موجود", 404);
      }
      const iscorrectPassword = await bcrypt.compare(
        req.body.currentPasword,
        user.password
      );
      if (!iscorrectPassword) {
        throw new ApiError("الباسورد القديم غير صحيح", 401);
      }
      if (val !== req.body.passwordConfirm) {
        throw new ApiError("in Correct passwordConfirm", 401);
      }
    }),
  MiddlewareValidator,
];
