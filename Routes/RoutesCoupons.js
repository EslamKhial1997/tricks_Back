const { Router } = require("express");

const { protect, allowedTo } = require("../Service/AuthService");
const {
  createCoupon,
  getCoupons,
} = require("../Service/CouponService");
const { createMiddleware } = require("../Service/Middleware");
const { createCouponValidator } = require("../Resuble/CouponValidationError");

const Routes = Router();
Routes.use(protect);
Routes.route("/coupon/")
  .post(
    allowedTo("admin", "teacher"),
    createMiddleware,
    createCouponValidator,
    createCoupon
  )
  .get(allowedTo("admin", "teacher"), getCoupons);

module.exports = Routes;
