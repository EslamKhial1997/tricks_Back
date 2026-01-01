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

    res.json({ message: "تم إنشاء الجروب بنجاح", data: newGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء الجروب" });
  }
});
exports.getGroups = factory.getAll(createGroupModel);
exports.getGroup = factory.getOne(createGroupModel, [
  { path: "members", select: "name phone" },
  { path: "pendingRequests", select: "name phone" },
  { path: "teacher", select: "name" },
  { path: "grade", select: "name" },
]);
exports.updateGroup = factory.updateOne(createGroupModel, "Group");
exports.deleteGroup = factory.deleteOne(createGroupModel, "Group");

// @desc    Generate or regenerate invite code
// @route   POST /api/v1/group/:id/generate-invite
// @access  Protected/Teacher
exports.generateInviteCode = expressAsyncHandler(async (req, res, next) => {
  const group = await createGroupModel.findById(req.params.id);

  if (!group) {
    return res.status(404).json({ error: "الجروب غير موجود" });
  }

  const groupTeacherId = group.teacher?._id || group.teacher;
  if (!groupTeacherId || groupTeacherId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "غير مسموح لك بإدارة هذا الجروب" });
  }

  // Generate a short, readable invite code (8 characters)
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let inviteCode = '';
  for (let i = 0; i < 8; i++) {
    inviteCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  // Format as XXXX-XXXX
  inviteCode = inviteCode.slice(0, 4) + '-' + inviteCode.slice(4);

  group.inviteCode = inviteCode;
  await group.save();

  res.json({ message: "تم إنشاء كود الدعوة بنجاح", data: group });
});

// @desc    Request to join a group
// @route   POST /api/v1/group/:id/join-request
// @access  Protected/User
exports.requestToJoin = expressAsyncHandler(async (req, res, next) => {
  const group = await createGroupModel.findById(req.params.id);
  if (!group) {
    return res.status(404).json({ error: "الجروب غير موجود" });
  }

  if (group.members.includes(req.user._id)) {
    return res.status(400).json({ error: "أنت عضو بالفعل في هذا الجروب" });
  }

  if (group.pendingRequests.includes(req.user._id)) {
    return res.status(400).json({ error: "تم إرسال طلب انضمام بالفعل" });
  }

  if (group.bannedUsers.includes(req.user._id)) {
    return res.status(403).json({ error: "أنت محظور من هذا الجروب" });
  }

  group.pendingRequests.push(req.user._id);
  await group.save();

  res.json({ message: "تم إرسال طلب الانضمام بنجاح" });
});

// @desc    Accept or reject join request
// @route   POST /api/v1/group/:id/handle-request
// @access  Protected/Teacher
exports.handleJoinRequest = expressAsyncHandler(async (req, res, next) => {
  const { userId, status } = req.body;
  const group = await createGroupModel.findById(req.params.id);

  if (!group) {
    return res.status(404).json({ error: "الجروب غير موجود" });
  }

  // Debugging info
  const groupTeacherId = group.teacher?._id || group.teacher;
  if (!groupTeacherId || groupTeacherId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "غير مسموح لك بإدارة هذا الجروب" });
  }

  // Ensure we are comparing strings
  const cleanUserId = userId?.toString();
  const hasRequested = group.pendingRequests.some(id => {
    const pendingId = id?._id ? id._id.toString() : id.toString();
    return pendingId === cleanUserId;
  });

  if (!hasRequested) {
    console.log("Pending Requests in DB:", group.pendingRequests);
    console.log("Requested User ID:", cleanUserId);
    return res.status(400).json({ error: "هذا المستخدم لم يطلب الانضمام" });
  }

  group.pendingRequests = group.pendingRequests.filter(
    (id) => (id?._id ? id._id.toString() : id.toString()) !== cleanUserId
  );

  if (status === "accept") {
    if (!group.members.includes(userId)) {
      group.members.push(userId);
    }
  }

  await group.save();
  res.json({ message: status === "accept" ? "تم قبول الطالب بنجاح" : "تم رفض الطلب" });
});

// @desc    Join group via invite code
// @route   POST /api/v1/group/join-invite
// @access  Protected/User
exports.joinByInvite = expressAsyncHandler(async (req, res, next) => {
  const { inviteCode } = req.body;
  const group = await createGroupModel.findOne({ inviteCode });

  if (!group) {
    return res.status(404).json({ error: "كود الدعوة غير صالح" });
  }

  if (group.members.includes(req.user._id)) {
    return res.status(400).json({ error: "أنت عضو بالفعل في هذا الجروب" });
  }

  if (group.bannedUsers.includes(req.user._id)) {
    return res.status(403).json({ error: "أنت محظور من هذا الجروب" });
  }

  group.members.push(req.user._id);
  // remove from pending if exists
  group.pendingRequests = group.pendingRequests.filter(
    (id) => id.toString() !== req.user._id.toString()
  );

  await group.save();

  res.json({ message: "تم الانضمام للجروب بنجاح" });
});

// @desc    Kick or Block member
// @route   POST /api/v1/group/:id/manage-member
// @access  Protected/Teacher
exports.manageMember = expressAsyncHandler(async (req, res, next) => {
  const { userId, action } = req.body; // action: 'kick' or 'block'
  const group = await createGroupModel.findById(req.params.id);

  if (!group) {
    return res.status(404).json({ error: "الجروب غير موجود" });
  }

  const groupTeacherId = group.teacher?._id || group.teacher;
  if (!groupTeacherId || groupTeacherId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "غير مسموح لك بإدارة هذا الجروب" });
  }

  group.members = group.members.filter(
    (id) => id?.toString() !== userId?.toString()
  );

  if (action === "block") {
    if (!group.bannedUsers.some(id => id?.toString() === userId?.toString())) {
      group.bannedUsers.push(userId);
    }
  }

  await group.save();
  res.json({ message: action === "block" ? "تم حظر الطالب بنجاح" : "تم إخراج الطالب من الجروب" });
});
