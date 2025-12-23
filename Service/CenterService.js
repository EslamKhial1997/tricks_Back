const factory = require("./FactoryHandler");
const createCenterModel = require("../Modules/createCenter");
const expressAsyncHandler = require("express-async-handler");

exports.createCenter = factory.createOne(createCenterModel);
exports.getCenter = factory.getOne(createCenterModel);
exports.getMyCenters = expressAsyncHandler(async (req, res, next) => {
    
  let myDoc =await createCenterModel.find({teacher:req.teacher});
  if (!myDoc)
    next(
      new ApiError(`Sorry Can't get This ID From ID :${req.params.id}`, 404)
    );
  res.status(200).json({ data: myDoc });
});
exports.updateCenter = factory.updateOne(createCenterModel);
exports.deleteCenter = factory.deleteOne(createCenterModel);
