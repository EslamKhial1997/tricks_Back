const { check } = require("express-validator");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");
const createLecturesModel = require("../Modules/createAlecture");

exports.createCouponValidator = [
  check("count").notEmpty().withMessage("عدد الكوبونات مطلوب"),
  check("expires").notEmpty().withMessage("تاريخ انتهاء الكوبون مطلوب"),
  check("seen").notEmpty().withMessage("عدد المشاهدات مطلوب"),
  check("lecture")
    .isMongoId()
    .notEmpty()
    .withMessage("معرف المحاضرة أو الفصل مطلوب")
    .custom(async (val, { req }) => {
      const lecture = await createLecturesModel.findOne({ _id: val });

      if (req.user.role === "admin") {
        if (
          req.user.teacher._id.toString() !== lecture.teacher._id.toString()
        ) {
          return Promise.reject(
            new Error("ليس لديك صلاحية إنشاء كوبون لهذا المدرس")
          );
        }
      } else if (req.user.role === "teacher") {
        if (req.user._id.toString() !== lecture.teacher._id.toString()) {
          return Promise.reject(
            new Error("ليس لديك صلاحية إنشاء كوبون لهذه المحاضرة ")
          );
        }
      }

      return true;
    }),
  MiddlewareValidator,
];

exports.getCouponValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To get Coupon"),
  MiddlewareValidator,
];
