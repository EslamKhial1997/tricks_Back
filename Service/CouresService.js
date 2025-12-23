const expressAsyncHandler = require("express-async-handler");
const factory = require("./FactoryHandler");
const ApiError = require("../Resuble/ApiErrors");
const createLecturesModel = require("../Modules/createAlecture");
const createCouresModel = require("../Modules/createCouress");
const createCouponsModel = require("../Modules/createCoupon");
const createUsersModel = require("../Modules/createUsers");
const createTransactionModel = require("../Modules/createtransaction");

exports.createCoures = expressAsyncHandler(async (req, res, next) => {
  try {
    const lactureModel = await createLecturesModel.findById(req.body.lacture);

    const couponModel = req.couponModel;
    const price = couponModel ? couponModel.lecture.price : lactureModel.price;
    const priceAfterDiscount = couponModel
      ? (price - (price * couponModel.discount) / 100).toFixed(0)
      : price;

    if (req.user.point < priceAfterDiscount) {
      return next(
        new ApiError(
          `سعر المحاضره ${price} اكبر من رصيدك ${req.user.point}`,
          500
        )
      );
    }

    let coures = await createCouresModel.findOne({ user: req.user._id });
    if (!coures) {
      coures = await createCouresModel.create({
        user: req.user._id,
        teacher: [],
        couresItems: [],
      });
    }

    const teacherId = lactureModel.teacher._id.toString();

    const teacherExists = coures.teacher.some(
      (teacher) => teacher.teacherID.toString() === teacherId
    );
    if (!teacherExists) {
      coures.teacher.push({
        name: lactureModel.teacher.name,
        teacherID: lactureModel.teacher._id,
      });
    }
    if (lactureModel) {
      const lectureExistsIndex = coures.couresItems.findIndex(
        (item) => item.lacture._id.toString() === lactureModel._id.toString()
      );

      if (lectureExistsIndex === -1) {
        coures.couresItems.push({
          lacture: lactureModel._id,
          teacherID: lactureModel.teacher._id,
          coupon: couponModel ? couponModel.code : null,
          expires: couponModel
            ? couponModel.expires
            : new Date(new Date().getTime() + 300 * 24 * 60 * 60 * 1000),
          discount: couponModel ? couponModel.discount : null,
        });
      } else {
        return res.status(404).json({
          status: "Failure",
          msg: "المحاضره موجوده من قبل",
        });
      }
      await coures.save();
    }

    const totalPriceAfterDiscount = couponModel
      ? (price - (price * couponModel.discount) / 100).toFixed(0)
      : price;

    const user = await createUsersModel.findByIdAndUpdate(
      req.user._id,
      { point: req.user.point - totalPriceAfterDiscount },
      { new: true }
    );
    await createTransactionModel.create({
      user: req.user._id,
      teacher: lactureModel.teacher._id,
      point: totalPriceAfterDiscount,
      lecture: lactureModel._id,
      type: "lecture",

      coupon: {
        code: couponModel?.code,
        expires: couponModel?.expires,
        discount: couponModel?.discount,
        createdBy: couponModel?.createdBy,
      },
    });

    if (couponModel) {
      await createCouponsModel.findByIdAndDelete(couponModel._id);
    }

    await user.save();

    res.status(200).json({
      data: {
        coures,
      },
    });
  } catch (error) {
    next(error);
  }
});

exports.getCoures = factory.getOneCourse(createCouresModel);
exports.deleteCourses = factory.deleteOne(createCouresModel);
exports.deleteSpecificCourseItem = expressAsyncHandler(
  async (req, res, next) => {
    const coures = await createCouresModel.findOneAndUpdate(
      { user: req.user._id },
      {
        $pull: { couresItems: { _id: req.params.id } },
      },
      { new: true }
    );
    res.status(200).json({
      status: "success",
      data: coures,
    });
  }
);
const mongoose = require("mongoose");

exports.updateCourseTime = expressAsyncHandler(async (req, res, next) => {
  try {
    const { duration } = req.body;
    const { id: lectureId, mediaId } = req.params;

    const doc = await createCouresModel.findOne({
      user: req.user._id,
      "couresItems.lacture": lectureId,
    });

    if (!doc) {
      return res.status(404).json({ msg: "لم يتم العثور على الكورس" });
    }

    const courseItem = doc.couresItems.find(
      (item) => item.lacture._id.toString() === lectureId
    );

    if (!courseItem) {
      return res.status(404).json({ msg: "العنصر غير موجود في الكورس" });
    }

    const seenItem = courseItem.seenItem.find(
      (item) => item.type.toString() === mediaId
    );

    if (!seenItem) {
      return res.status(404).json({ msg: "هذا الفيديو غير موجود في seenItem" });
    }

    const mediaObjectId = new mongoose.Types.ObjectId(mediaId);
    const lectureObjectId = new mongoose.Types.ObjectId(lectureId);

    const videoTime = Number(seenItem.videoTime); // ← ناخد الوقت من داخل العنصر
    let currentDuration = Number(seenItem.duration || 0);
    let currentCount = Number(seenItem.count || 0);
    const addedDuration = Number(duration || 0);

    if (!videoTime || isNaN(videoTime)) {
      return res
        .status(400)
        .json({ msg: "المدة الأصلية للفيديو غير صالحة داخل seenItem" });
    }

    if (currentCount === 0) {
      return res.status(403).json({ msg: "تجاوزت الحد الأقصى للمشاهدات" });
    }

    let totalDuration = currentDuration + addedDuration;
    let newCount = currentCount;

    while (totalDuration >= videoTime && newCount > 0) {
      totalDuration -= videoTime;
      newCount--;
    }

    if (newCount === 0 && totalDuration >= videoTime) {
      return res.status(403).json({ msg: "تجاوزت عدد المشاهدات المسموحة" });
    }

    const updatedCourse = await createCouresModel.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          "couresItems.$[course].seenItem.$[media].duration": totalDuration,
          "couresItems.$[course].seenItem.$[media].count": newCount,
        },
      },
      {
        arrayFilters: [
          { "course.lacture": lectureObjectId },
          { "media.type": mediaObjectId },
        ],
        new: true,
      }
    );

    res.status(200).json({
      status: "success",
      msg: "تم تحديث مدة المشاهدة وعدد المشاهدات بنجاح",
      data: {
        duration: totalDuration,
        count: newCount,
      },
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ msg: "خطأ في السيرفر", error: err.message });
  }
});
