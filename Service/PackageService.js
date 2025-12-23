const factory = require("./FactoryHandler");
const createPackageModel = require("../Modules/createPackage");
const expressAsyncHandler = require("express-async-handler");
const FeatureApi = require("../Utils/Feature");

exports.createPackage = expressAsyncHandler(async (req, res) => {
  const package = await createPackageModel.create(req.body);
  res.status(201).json({ status: "Success", data: package });
});
exports.getPackages = expressAsyncHandler(async (req, res) => {
  let fillter =
    req.user.role === "teacher"
      ? { teacher: req.user._id }
      : req.user.role === "admin"
      ? { teacher: req.user.teacher }
      : {};


  const ApiFeatures = new FeatureApi(
    createPackageModel.find(fillter),
    req.query
  ).Fillter(fillter);

  const { MongooseQueryApi, PaginateResult } = ApiFeatures;
  const getDoc = await MongooseQueryApi;
  res
    .status(201)
    .json({ results: getDoc.length, PaginateResult, data: getDoc });
});
exports.getPackage = factory.getOne(createPackageModel);
exports.updatePackage = factory.updateOne(createPackageModel, "Package");
exports.deletePackage = factory.deleteOne(createPackageModel, "Package");
