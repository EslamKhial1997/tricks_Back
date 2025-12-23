const factory = require("./FactoryHandler");
const createSectionModel = require("../Modules/createSection");
const expressAsyncHandler = require("express-async-handler");
const FeatureApi = require("../Utils/Feature");
exports.createSections = factory.createOne(createSectionModel);
exports.getSections = expressAsyncHandler(async (req, res) => {
  let fillter = {};
  if (req.filterObject) {
    fillter = req.filterObject;
  }

  const countDocs = await createSectionModel.countDocuments();
  const ApiFeatures = new FeatureApi(
    createSectionModel.find(fillter),
    req.query
  )
    .Fillter(createSectionModel)
    .Sort()
    .Fields()
    .Search()
    .Paginate(countDocs);
  const { MongooseQueryApi, PaginateResult } = ApiFeatures;
  const getDoc = await MongooseQueryApi;
  res
    .status(201)
    .json({ results: getDoc.length, PaginateResult, data: getDoc });
});
exports.getSection = factory.getOne(createSectionModel);
exports.updateSection = factory.updateOne(createSectionModel, "section");
exports.deleteSection = factory.deleteOne(createSectionModel, "section");
