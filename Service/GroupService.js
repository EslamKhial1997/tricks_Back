const factory = require("./FactoryHandler");
const createGroupModel = require("../Modules/createGroup");
const expressAsyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");

exports.createGroup = expressAsyncHandler(async (req, res) => {
  const { grade , name } = req.body;

  try {
    const existingGroup = await createGroupModel.findOne({
      grade,
      teacher: req.user._id,
    });
    if (existingGroup) {
      return res.status(400).json({ error: "تم إنشاء جروب لهذا الصف بالفعل" });
    }

    const groupToken = uuidv4();
    const newGroup = new createGroupModel({
      grade,
      name,
      token: groupToken,
      teacher: req.user._id,
      bannedUsers: [],
    });

    await newGroup.save();

    res.json({ message: "تم إنشاء الجروب بنجاح", groupToken });
  } catch (err) {
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء الجروب" });
  }
});
exports.getGroups = factory.getAll(createGroupModel);
exports.getGroup = factory.getOne(createGroupModel);
exports.updateGroup = factory.updateOne(createGroupModel, "Group");
exports.deleteGroup = factory.deleteOne(createGroupModel, "Group");
