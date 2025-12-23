const { check } = require("express-validator");
const {
  MiddlewareValidator,
} = require("../Middleware/MiddlewareValidatorError");

const createCouponsModel = require("../Modules/createCoupon");
const createLecturesModel = require("../Modules/createAlecture");

exports.createCourseValidator = [
  check("coupon")
    .optional()
    .custom(async (val, { req }) => {
      const couponModel = await createCouponsModel.findOne({
        code: req.body.coupon,
        expires: { $gt: Date.now() },
      });
      if (!couponModel) {
        return Promise.reject(new Error(`الكوبون ${val} غير صالح أو منتهي`));
      }

      req.couponModel = couponModel;
    }),
  check("lacture")
    .notEmpty()
    .custom(async (val, { req }) => {
      const lectureModel = await createLecturesModel.findOne({
        _id: val,
      });

      if (!lectureModel) {
        return Promise.reject(new Error(`المحاضرة غير موجودة`));
      }
      if (req.couponModel && req.couponModel.lecture) {
        if (req.couponModel.lecture._id.toString() !== val) {
          return Promise.reject(
            new Error(`الكوبون ${req.body.coupon} لا ينتمي لهذه المحاضرة`)
          );
        }
      }
    }),

  MiddlewareValidator,
];


exports.getLectureValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To get Lecture"),
  MiddlewareValidator,
];
exports.updateLectureValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To update Lecture"),
  MiddlewareValidator,
];
exports.deleteLectureValidator = [
  check("id").isMongoId().withMessage("Id Not Vaild To delete Lecture"),
  MiddlewareValidator,
];
