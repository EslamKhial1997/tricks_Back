const expressAsyncHandler = require("express-async-handler");
const createCouponsModel = require("../Modules/createCoupon");
const createTotalsModel = require("../Modules/createTotals");

exports.createCoupon = expressAsyncHandler(async (req, res) => {
  try {
    const { count, discount, expires, lecture ,seen } = req.body;
    const teacher = req.teacher;

    const coupons = Array.from({ length: count }, () => ({
      code: Math.floor(Math.random() * 10 ** 10).toString(),
      seen,
      createdBy:req.user.name,
      discount,
      expires: new Date(Date.now() + expires * 24 * 60 * 60 * 1000),
      lecture,
      teacher,
    }));

    if (!coupons.length) {
      return res
        .status(500)
        .json({ status: "فشل", msg: "حدث خطأ أثناء إنشاء الكوبونات" });
    }
    
    const insertedCoupons = await createCouponsModel.insertMany(coupons);


    const populatedCoupons = await createCouponsModel
      .find({ _id: { $in: insertedCoupons.map((c) => c._id) } })
      .populate("lecture", "lecture price")
      .populate("teacher", "name image");

    await createTotalsModel.findOneAndUpdate(
      { teacher },
      { $inc: { totalCouponsPrinted: insertedCoupons.length } },
      { upsert: true, new: true }
    );

    res.status(201).json({
      status: "العملية تمت بنجاح",
      data: populatedCoupons,
    });
  } catch (error) {
    res.status(500).json({ status: "خطأ", msg: "حدث خطأ غير متوقع" });
  }
});

exports.getCoupons = expressAsyncHandler(async (req, res, next) => {
  try {
    const coupon = await createCouponsModel.find({
      teacher: req.user.role === "admin" ? req.user.teacher : req.user._id,
    });
    res.status(201).json({
      data: coupon,
    });
  } catch (error) {
    res.status(500).json({ status: "خطأ", msg: "حدث خطأ غير متوقع" });
  }
});
