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
    let price = 0;
    let priceAfterDiscount = 0;
    let dataToBuy = null;
    let lecturesList = [];

    // 1️⃣ Check if the user is buying a Section or a Lecture
    if (req.body.section) {
      // --- Buying a Whole Section ---
      const createSectionModel = require("../Modules/createSection"); // Adjust path if needed
      const sectionModel = await createSectionModel.findById(req.body.section);

      if (!sectionModel) {
        return next(new ApiError("القسم غير موجود", 404));
      }

      dataToBuy = sectionModel;

      // Find all lectures in this section
      lecturesList = await createLecturesModel.find({
        section: req.body.section,
      });

      if (lecturesList.length === 0) {
        return next(new ApiError("هذا القسم لا يحتوي على محاضرات بعد", 404));
      }

      const couponModel = req.couponModel;
      price = couponModel ? (couponModel.section ? couponModel.section.price : sectionModel.price) : sectionModel.price;

      priceAfterDiscount = couponModel
        ? (price - (price * couponModel.discount) / 100).toFixed(0)
        : price;

    } else if (req.body.lacture) {
      // --- Buying a Single Lecture (Original Logic) ---
      const lactureModel = await createLecturesModel.findById(req.body.lacture);
      if (!lactureModel) {
        return next(new ApiError("المحاضرة غير موجودة", 404));
      }
      dataToBuy = lactureModel;
      lecturesList = [lactureModel]; // Just one lecture

      const couponModel = req.couponModel;
      price = couponModel ? couponModel.lecture.price : lactureModel.price;
      
      priceAfterDiscount = couponModel
        ? (price - (price * couponModel.discount) / 100).toFixed(0)
        : price;
    } else {
      return next(new ApiError("يجب تحديد محاضرة أو قسم للشراء", 400));
    }

    // 2️⃣ Check User Points
    if (req.user.point < priceAfterDiscount) {
      return next(
        new ApiError(
          `سعر ${req.body.section ? "القسم" : "المحاضرة"} ${priceAfterDiscount} اكبر من رصيدك ${req.user.point}`,
          500
        )
      );
    }

    // 3️⃣ Get or Create User's Course Record
    let coures = await createCouresModel.findOne({ user: req.user._id });
    if (!coures) {
      coures = await createCouresModel.create({
        user: req.user._id,
        teacher: [],
        couresItems: [],
      });
    }

    // 4️⃣ Add Teachers to Course Record
    // Collect all unique teachers from the list of lectures we are buying
    lecturesList.forEach((lectureItem) => {
       const teacherId = lectureItem.teacher._id.toString();
       const teacherExists = coures.teacher.some(
         (teacher) => teacher.teacherID.toString() === teacherId
       );
       if (!teacherExists) {
         coures.teacher.push({
           name: lectureItem.teacher.name,
           teacherID: lectureItem.teacher._id,
         });
       }
    });

    // 5️⃣ Add Lectures to User's Course items
    let itemsAddedCount = 0;
    const couponModel = req.couponModel; // Re-assign for scope access if needed

    for (const lectureItem of lecturesList) {
      const lectureExistsIndex = coures.couresItems.findIndex(
        (item) => item.lacture._id.toString() === lectureItem._id.toString()
      );

      if (lectureExistsIndex === -1) {
         coures.couresItems.push({
           lacture: lectureItem._id,
           teacherID: lectureItem.teacher._id,
           coupon: couponModel ? couponModel.code : null,
           expires: couponModel
             ? couponModel.expires
             : new Date(new Date().getTime() + 300 * 24 * 60 * 60 * 1000), // Default 300 days
           discount: couponModel ? couponModel.discount : null,
         });
         itemsAddedCount++;
      }
    }

    if (itemsAddedCount === 0) {
      return res.status(400).json({
        status: "Failure",
        msg: req.body.section ? "أنت تمتلك جميع محاضرات هذا القسم بالفعل" : "المحاضرة موجودة من قبل",
      });
    }

    await coures.save();

    // 6️⃣ Deduct Points & Create Transaction
    const finalPrice = Number(priceAfterDiscount);
    
    const user = await createUsersModel.findByIdAndUpdate(
      req.user._id,
      { $inc: { point: -finalPrice } },
      { new: true }
    );
    console.log("👤 User points after update:", user?.point);

    const transactionData = {
      user: req.user._id,
      teacher: dataToBuy.teacher._id || (lecturesList[0] && lecturesList[0].teacher._id),
      point: finalPrice,
      type: req.body.section ? "section" : "lecture",
      coupon: {
        code: couponModel?.code,
        expires: couponModel?.expires,
        discount: couponModel?.discount,
        createdBy: couponModel?.createdBy,
      },
    };

    if (req.body.section) {
        transactionData.section = dataToBuy._id;
    } else {
        transactionData.lecture = dataToBuy._id;
    }

    await createTransactionModel.create(transactionData);

    if (couponModel) {
      await createCouponsModel.findByIdAndDelete(couponModel._id);
    }

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
