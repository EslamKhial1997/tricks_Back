const expressAsyncHandler = require("express-async-handler");
const ApiError = require("../Resuble/ApiErrors");
const createWalletModel = require("../Modules/createWallet");
const createTeachersModel = require("../Modules/createTeacher");
const factory = require("./FactoryHandler");

// @desc    Create specific wallet
// @route   POST /api/v1/wallet
// @access  Private/Teacher
exports.createWallet = expressAsyncHandler(async (req, res, next) => {
  req.body.teacher = req.user._id;

  const wallet = await createWalletModel.create(req.body);

  // Sync with Teacher Profile (Set as current active)
  await createTeachersModel.findByIdAndUpdate(req.user._id, {
    walletNumber: req.body.number,
  });

  res.status(201).json({ status: "success", data: wallet });
});

// @desc    Get my wallets (or all wallets if manager)
// @route   GET /api/v1/wallet/me
// @access  Private/Teacher/Manager
exports.getMyWallets = expressAsyncHandler(async (req, res, next) => {
  let wallets;
  
  if (req.user.role === "manager") {
    // Manager sees all wallets with teacher information
    wallets = await createWalletModel.find({})
      .populate("teacher", "name email image")
      .sort("-createdAt");
  } else {
    // Teacher sees only their own wallets
    wallets = await createWalletModel.find({ teacher: req.user._id });
  }
  
  res.status(200).json({ status: "success", results: wallets.length, data: wallets });
});

// @desc    Update my wallet
// @route   PUT /api/v1/wallet/me/:id
// @access  Private/Teacher
exports.updateMyWallet = expressAsyncHandler(async (req, res, next) => {
  const wallet = await createWalletModel.findOneAndUpdate(
    { _id: req.params.id, teacher: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!wallet) {
    return next(new ApiError("لم يتم العثور على محفظة", 404));
  }

  // Sync with Teacher Profile
  if (req.body.number) {
    await createTeachersModel.findByIdAndUpdate(req.user._id, {
      walletNumber: req.body.number,
    });
  }

  res.status(200).json({ status: "success", data: wallet });
});

// @desc    Delete my wallet
// @route   DELETE /api/v1/wallet/me/:id
// @access  Private/Teacher
exports.deleteMyWallet = expressAsyncHandler(async (req, res, next) => {
  const wallet = await createWalletModel.findOneAndDelete({ 
    _id: req.params.id, 
    teacher: req.user._id 
  });

  if (!wallet) {
    return next(new ApiError("لم يتم العثور على محفظة", 404));
  }

  // Check remaining wallets to sync
  const remaining = await createWalletModel.findOne({ teacher: req.user._id });
  await createTeachersModel.findByIdAndUpdate(req.user._id, {
    walletNumber: remaining ? remaining.number : "",
  });

  res.status(204).json({ status: "success", data: null });
});

// Admin/Manager Access
exports.getAllWallets = factory.getAll(createWalletModel);
exports.getWallet = factory.getOne(createWalletModel);
exports.updateWallet = factory.updateOne(createWalletModel);
exports.deleteWallet = factory.deleteOne(createWalletModel);
