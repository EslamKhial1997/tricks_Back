const { check, body } = require("express-validator");
const { default: slugify } = require("slugify");
const bcrypt = require("bcryptjs");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");
const createUsersModel = require("../Modules/createUsers");
const createTeachersModel = require("../Modules/createTeacher");

exports.createTeachersValidator = [
  check("name")
    .notEmpty()
    .withMessage("is required teachername")
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
      createTeachersModel.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("E-mail already in user"));
        }
      })
    ),
  check("email")
    .isEmail()
    .withMessage("Must be at E-mail Address")
    .custom((val) =>
      createUsersModel.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("E-mail already in user"));
        }
      })
    ),

  check("phone")
    .notEmpty()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .custom((val, { req }) => {
      req.body.wallet = val;
      return true;
    })
    .withMessage("Invailable phone number EG , SA Number Only accepted")
    .custom((val) =>
      createTeachersModel.findOne({ phone: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("Phone Is Already in Used"));
        }
      })
    )
    .withMessage("Phone Is Already in Used"),
  MiddlewareValidator,
];

exports.getOneUserValidator = [
  check("id").isMongoId().withMessage("Sorry ID Not Available To get"),
  MiddlewareValidator,
];
exports.updateTeacherValidator = [
  check("id").isMongoId().withMessage("Sorry ID Not Available To Update"),
  check("teachername")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),
  MiddlewareValidator,
];
exports.deleteOneTeacherValidator = [
  check("id").isMongoId().withMessage("Sorry ID Not Available To Delete"),
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
      const user = await createTeachersModel.findById(req.user._id);

      if (!user) {
        throw new Error("Old Password does not match");
      }
      const iscorrectPassword = await bcrypt.compare(
        req.body.currentPasword,
        user.password
      );
      if (!iscorrectPassword) {
        throw new Error("in Correct CurentPassword");
      }
      if (val !== req.body.passwordConfirm) {
        throw new Error("in Correct passwordConfirm");
      }
    }),
  MiddlewareValidator,
];

exports.UpdatePaidTeacherValidation = [
  // التحقق من أن المعرف هو معرف Mongo صالح
  check("id")
    .isMongoId()
    .withMessage("المعرف غير صالح")
    .custom(async (val, { req }) => {
      const teacher = await createTeachersModel.findOne({
        _id: req.user._id, // التحقق من وجود المدرس
        "paid._id": val, // البحث عن المعاملة الخاصة بهذا المعرف في مصفوفة المدفوعات
      });
      if (!teacher) {
        return Promise.reject(new Error("المعاملة الخاصة بالمدرس غير موجودة"));
      }
    }),

  // استدعاء MiddlewareValidator للتحقق من الأخطاء
  MiddlewareValidator,
];
