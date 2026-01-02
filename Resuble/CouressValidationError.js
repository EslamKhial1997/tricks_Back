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

      // If buying section and coupon is for section, validate they match
      if (req.body.section && couponModel.section) {
          if (couponModel.section._id.toString() !== req.body.section) {
              return Promise.reject(new Error(`الكوبون ${val} لا ينتمي لهذا القسم`));
          }
      }
      // If buying lecture and coupon is for lecture, validate they match
      if (req.body.lacture && couponModel.lecture) {
          if (couponModel.lecture._id.toString() !== req.body.lacture) {
              return Promise.reject(new Error(`الكوبون ${val} لا ينتمي لهذه المحاضرة`));
          }
      }
    }),
  check("lacture")
    .optional()
    .custom(async (val, { req }) => {
      if (!val && !req.body.section) {
        return Promise.reject(new Error(`يجب تحديد محاضرة أو قسم للشراء`));
      }
      if (val) {
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
      }
    }),
  check("section")
    .optional()
    .custom(async (val, { req }) => {
      if (val) {
        const createSectionModel = require("../Modules/createSection");
        const sectionModel = await createSectionModel.findById(val);
        if (!sectionModel) {
          return Promise.reject(new Error(`القسم غير موجود`));
        }
        if (req.couponModel && req.couponModel.section) {
          if (req.couponModel.section._id.toString() !== val) {
            return Promise.reject(
              new Error(`الكوبون ${req.body.coupon} لا ينتمي لهذا القسم`)
            );
          }
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
