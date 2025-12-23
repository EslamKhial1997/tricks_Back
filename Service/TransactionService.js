const expressAsyncHandler = require("express-async-handler");
const { default: axios } = require("axios");
const ApiError = require("../Resuble/ApiErrors");
const createPackageModel = require("../Modules/createPackage");
const createClassModel = require("../Modules/createClasses");
const createSectionModel = require("../Modules/createSection");
const createLecturesModel = require("../Modules/createAlecture");
const FeatureApi = require("../Utils/Feature");
const createTransactionModel = require("../Modules/createtransaction");
const createCouponsModel = require("../Modules/createCoupon");
const createCouresModel = require("../Modules/createCouress");

const axiosRequest = async (url, headers) => {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    throw new ApiError("خطأ في سيرفر الفيديوهات أثناء جلب البيانات", 500);
  }
};
exports.getTotalTransactions = expressAsyncHandler(async (req, res, next) => {
  try {
    const package = await createPackageModel.findOne();
    const bunny = await axios
      .get(`https://api.bunny.net/videolibrary/${package.libraryID}`, {
        headers: {
          accept: "application/json",
          AccessKey: package.token,
        },
      })
      .then((response) => response.data)
      .catch(() => null);

    const usersActive = await createUsersModel.countDocuments({
      active: "active",
      role: "user",
    });
    const usersinActive = await createUsersModel.countDocuments({
      active: "inactive",
      role: "user",
    });
    const usersBlocked = await createUsersModel.countDocuments({
      active: "block",
      role: "user",
    });
    const coupons = await createCouponsModel.countDocuments({});
    const totalCouresUsers = await createCouresModel.countDocuments({});

    const couress = await createCouresModel.aggregate([
      {
        $project: {
          couresItemsCount: { $size: "$couresItems" }, // استخدام $size لحساب عدد العناصر
        },
      },
    ]);
    const totalCouresItems = couress.reduce(
      (acc, item) => acc + item.couresItemsCount,
      0
    );

    const couponSold = await createTransactionModel.countDocuments({});
    const totalCouponPrinted = await createTotalsModel.findOne({});
    const lecture = await createLecturesModel.countDocuments({});
    const section = await createSectionModel.countDocuments({});

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const saleHistory = await createTransactionModel.aggregate([
      {
        $lookup: {
          from: "lectures",
          localField: "lecture",
          foreignField: "_id",
          as: "lectureDetails",
        },
      },
      {
        $addFields: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          week: { $week: "$createdAt" },
          day: { $dayOfYear: "$createdAt" },
          priceNumeric: {
            $toDouble: { $arrayElemAt: ["$lectureDetails.price", 0] },
          },
        },
      },
      {
        $facet: {
          day: [
            {
              $match: { createdAt: { $gte: today } },
            },
            {
              $group: {
                _id: null,
                totalDaySold: { $sum: "$priceNumeric" },
              },
            },
          ],
          week: [
            {
              $match: { createdAt: { $gte: startOfWeek } },
            },
            {
              $group: {
                _id: null,
                totalWeekSold: { $sum: "$priceNumeric" },
              },
            },
          ],
          month: [
            {
              $match: { createdAt: { $gte: startOfMonth } },
            },
            {
              $group: {
                _id: null,
                totalMonthSold: { $sum: "$priceNumeric" },
              },
            },
          ],
          year: [
            {
              $match: { createdAt: { $gte: startOfYear } },
            },
            {
              $group: {
                _id: null,
                totalYearSold: { $sum: "$priceNumeric" },
              },
            },
          ],
        },
      },
    ]);

    const totalSalesHistory = {
      day:
        saleHistory[0]?.day?.length > 0
          ? saleHistory[0].day[0].totalDaySold
          : 0,
      week:
        saleHistory[0]?.week?.length > 0
          ? saleHistory[0].week[0].totalWeekSold
          : 0,
      month:
        saleHistory[0]?.month?.length > 0
          ? saleHistory[0].month[0].totalMonthSold
          : 0,
      year:
        saleHistory[0]?.year?.length > 0
          ? saleHistory[0].year[0].totalYearSold
          : 0,
    };

    if (bunny) {
      await createPackageModel.findByIdAndUpdate(
        package._id,
        {
          $set: {
            usedStorage: (bunny.StorageUsage / (1000 * 1000)).toFixed(1),
            usedTraffic: (bunny.TrafficUsage / (1000 * 1000)).toFixed(1),
          },
        },
        { new: true }
      );
    }

    return res.status(200).json({
      status: "success",
      users: {
        usersActive,
        usersinActive,
        usersBlocked,
        totalUsers: usersActive + usersinActive + usersBlocked,
      },
      lecture,
      section,
      coupons: {
        coupons,
        couponSold,
        couponExpires: totalCouponPrinted.totalCouponsPrinted - couponSold,
        totalCouponPrinted: totalCouponPrinted.totalCouponsPrinted,
      },
      bunny: {
        totalvideos: bunny?.VideoCount || 0,
        StorageUsage: {
          used: bunny
            ? Number((bunny.StorageUsage / (1000 * 1000)).toFixed(1))
            : 0,
          total: package.pricing.upload,
        },
        TrafficUsage: {
          used: bunny
            ? Number((bunny.TrafficUsage / (1000 * 1000)).toFixed(1))
            : 0,
          total: package.pricing.traffic,
        },
      },
      couresItems: {
        totalCouresItems,
        totalCouresUsers,
      },
      totalSalesHistory,
    });
  } catch (error) {
    next(error);
  }
});
exports.getMyTransactions = expressAsyncHandler(async (req, res) => {
  try {
    let filter =
      req.user.role === "admin"
        ? { teacher: req.user.teacher._id }
        : { teacher: req.user._id };

    if (req.filterObject) {
      filter = { ...filter, ...req.filterObject };
    }

    let transactions = [];
    let path = "";

    if (req.query.coupon) {
      transactions = await createTransactionModel.find({
        ...filter,
        "coupon.code": req.query.coupon,
      });

      if (transactions.length > 0) {
        path = "الكوبون مستخدم";
      } else {
        const coupon = await createCouponsModel.findOne({
          code: req.query.coupon,
        });

        if (coupon) {
          path = "الكوبون موجود ولم يُستخدم";
          transactions = [coupon];
        } else {
          path = "لم يتم إنشاء كوبون بهذا الكود";
        }
      }
    } else {
      const ApiFeatures = new FeatureApi(
        createTransactionModel.find({ ...filter, ...req.query })
      ).Fillter(createTransactionModel);

      const { MongooseQueryApi, PaginateResult } = ApiFeatures;
      transactions = await MongooseQueryApi;

      path = transactions.length > 0 ? "كل المعاملات" : "لا توجد معاملات";
    }
    res.status(200).json({
      status: "success",
      path,
      results: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

exports.getBunnyData = expressAsyncHandler(async (req, res, next) => {
  const package = await createPackageModel.findOne({ teacher: req.user._id });

  if (req.user.role === "manager") {
    try {
      const response = await axiosRequest(
        "https://api.bunny.net/videolibrary",
        {
          accept: "application/json",
          AccessKey: process.env.BUNNY_TOKEN,
        }
      );

      const data = response.map((item) => ({
        Name: item.Name,
        VideoCount: item.VideoCount,
        TrafficUsage: parseFloat((item.TrafficUsage / 1000 ** 2).toFixed(1)),
        StorageUsage: parseFloat((item.StorageUsage / 1000 ** 2).toFixed(1)),
      }));

      res.status(200).json({
        status: "Success",
        data,
      });
    } catch (error) {
      return next(error);
    }
  } else if (package) {
    try {
      const response = await axiosRequest(
        `https://video.bunnycdn.com/library/${package.libraryID}/videos`,
        {
          accept: "application/json",
          AccessKey: package.apiKey,
        }
      );

      const totalViews = response.items.reduce(
        (sum, item) => sum + item.views,
        0
      );
      const totalStorageSize = response.items.reduce(
        (sum, item) => sum + item.storageSize,
        0
      );
      const totalWatchTime = response.items.reduce(
        (sum, item) => sum + item.totalWatchTime,
        0
      );

      const totalStorageSizeGB = parseFloat(
        (totalStorageSize / 1000 ** 2).toFixed(1)
      );
      const totalsWatchHours = Math.floor(totalWatchTime / 60 / 60);

      res.status(200).json({
        status: "Success",
        data: {
          totalsWatchHours,
          totalVideos: response.totalItems,
          totalViews,
          totalStorageSizeGB,
        },
      });
    } catch (error) {
      return next(error);
    }
  } else {
    return next(new ApiError("حدث مشكلة", 404));
  }
});
exports.getClassesDetails = expressAsyncHandler(async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === "admin") {
      filter.teacher = req.user.teacher_id;
    } else if (req.user.role === "manager") {
      // No filter for manager
    } else {
      filter.teacher = req.user._id;
    }

    const classes = await createClassModel.find(filter);

    const classesWithSectionsAndLectures = await Promise.all(
      classes.map(async (cls) => {
        const sections = await createSectionModel
          .find({ class: cls._id })
          .exec();

        const sectionsWithLectures = await Promise.all(
          sections.map(async (section) => {
            const lectures = await createLecturesModel
              .find({ section: section._id })
              .exec();
            return { ...section.toObject(), lectures };
          })
        );

        return { ...cls.toObject(), sections: sectionsWithLectures };
      })
    );

    res.status(200).json({
      status: "success",
      data: classesWithSectionsAndLectures,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      msg: "حدث مشكلة في جلب البيانات",
    });
  }
});

exports.getSalesAnalytics = expressAsyncHandler(async (req, res) => {
  try {
    const { range } = req.query;
    let teacherId = req.user._id;

    if (req.user.role === "manager" && req.query.teacherId) {
      teacherId = req.query.teacherId;
    }

    const now = new Date();
    let fromDate;

    if (range === "today") {
      fromDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (range === "week") {
      const dayOfWeek = now.getDay();
      fromDate = new Date(now);
      fromDate.setDate(now.getDate() - dayOfWeek);
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const matchStage = { type: "lecture" };
    
    // IF manager AND teacherId provided OR user IS NOT manager => Filter by Teacher
    if ((req.user.role === "manager" && req.query.teacherId) || req.user.role !== "manager") {
      matchStage.teacher = teacherId;
    }

    if (fromDate) {
      matchStage.createdAt = { $gte: fromDate };
    }

    const aggregationResult = await createTransactionModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "lectures",
          localField: "lecture",
          foreignField: "_id",
          as: "lectureData",
        },
      },
      { $unwind: "$lectureData" },
      {
        $lookup: {
          from: "sections",
          localField: "lectureData.section",
          foreignField: "_id",
          as: "sectionData",
        },
      },
      { $unwind: "$sectionData" },
      {
        $lookup: {
          from: "classes",
          localField: "sectionData.class",
          foreignField: "_id",
          as: "classData",
        },
      },
      { $unwind: "$classData" },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$lectureData.price" },
          uniqueStudents: { $addToSet: "$user" },
          uniqueLectures: { $addToSet: "$lecture" },
          salesBySection: {
            $push: { name: "$sectionData.name", price: "$lectureData.price" },
          },
          salesByClass: {
            $push: { name: "$classData.name", price: "$lectureData.price" },
          },
        },
      },
    ]);

    const stats = aggregationResult[0] || {
      totalSales: 0,
      totalRevenue: 0,
      uniqueStudents: [],
      uniqueLectures: [],
      salesBySection: [],
      salesByClass: [],
    };

    // حساب التجميع اليدوي لأسماء الأقسام والصفوف
    const aggregateByName = (list) => {
      const result = {};
      for (const item of list) {
        result[item.name] = (result[item.name] || 0) + item.price;
      }
      return result;
    };

    const finalStats = {
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
      numberOfStudents: stats.uniqueStudents.length,
      numberOfLecturesSold: stats.uniqueLectures.length,
      salesBySection: aggregateByName(stats.salesBySection),
      salesByClass: aggregateByName(stats.salesByClass),
    };

    // كوبونات المعلم
    const coupons = await createCouponsModel.find({ teacher: teacherId });
    const couponCodes = coupons.map((c) => c.code);

    const usedCoupons = await createTransactionModel.aggregate([
      { $match: { "coupon.code": { $in: couponCodes } } },
      {
        $group: {
          _id: "$coupon.code",
          count: { $sum: 1 },
        },
      },
    ]);

    const usedCountMap = Object.fromEntries(
      usedCoupons.map((c) => [c._id, c.count])
    );

    const couponStats = {
      totalCoupons: coupons.length,
      totalViews: coupons.reduce((sum, c) => sum + (c.views || 0), 0),
      usedCouponsCount: Object.keys(usedCountMap).length,
      totalUsedCount: Object.values(usedCountMap).reduce((a, b) => a + b, 0),
    };

    // آخر 5 معاملات
    const recentMatchStage = {};
    if (req.user.role !== "manager") {
      recentMatchStage.teacher = teacherId;
    }

    const recentTransactions = await createTransactionModel.aggregate([
      { $match: recentMatchStage },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "lectures",
          localField: "lecture",
          foreignField: "_id",
          as: "lectureData",
        },
      },
      { $unwind: "$lectureData" },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "studentData",
        },
      },
      { $unwind: "$studentData" },
      {
        $project: {
          type: 1,
          lectureName: "$lectureData.lecture",
          price: "$lectureData.price",
          studentName: "$studentData.name",
          date: "$createdAt",
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      path: "إحصائيات وتحليل المبيعات والكوبونات",
      data: {
        ...finalStats,
        couponStats,
        recentTransactions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});