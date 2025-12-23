const expressAsyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ApiError = require("../Resuble/ApiErrors");
const { UploadSingleImage } = require("../Middleware/UploadImageMiddleware");
const createTransferModel = require("../Modules/createTransfer");
const createUsersModel = require("../Modules/createUsers");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads/transfer");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

exports.uploadTransferImage = UploadSingleImage("image");

exports.resizeTransferImage = expressAsyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  const filename = `transfer-${uuidv4()}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(800, 1200, { // Portrait optimized for screenshots
        fit: 'inside',
        withoutEnlargement: true 
    }) 
    .toFormat("jpeg")
    .jpeg({ quality: 80 })
    .toFile(path.join(uploadDir, filename));

  req.body.image = filename;
  next();
});

// @desc    Upload a new transfer screenshot
// @route   POST /api/v1/transfer
// @access  Private/User
exports.createTransfer = expressAsyncHandler(async (req, res, next) => {
  if (!req.body.image) {
    return next(new ApiError("Please upload an image", 400));
  }
  
  req.body.student = req.user._id;
  
  // Teacher ID should be passed in body
  if (!req.body.teacher) {
      return next(new ApiError("Teacher ID is required", 400));
  }

  const transfer = await createTransferModel.create(req.body);

  res.status(201).json({
    status: "success",
    data: transfer,
  });
});

// @desc    Get transfers for logged in teacher
// @route   GET /api/v1/transfer/me
// @access  Private/Teacher
exports.getMyTransfers = expressAsyncHandler(async (req, res, next) => {
  // Parsing pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 20;
  const skip = (page - 1) * limit;

  let query = { teacher: req.user._id };
  let populateOptions = { path: "student", select: "name phone email" };

  if (req.user.role === "user") {
    query = { student: req.user._id };
    populateOptions = { path: "teacher", select: "name" }; // Assuming teacher has a name
  }

  const transfers = await createTransferModel.find(query)
    .populate(populateOptions)
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  const total = await createTransferModel.countDocuments(query);

  res.status(200).json({
    status: "success",
    results: transfers.length,
    pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
    },
    data: transfers,
  });
});

// @desc    Update transfer status
// @route   PUT /api/v1/transfer/:id
// @access  Private/Teacher
exports.updateTransferStatus = expressAsyncHandler(async (req, res, next) => {
    const transfer = await createTransferModel.findOne({ 
        _id: req.params.id, 
        teacher: req.user._id 
    });

    if (!transfer) {
        return next(new ApiError("Transfer not found", 404));
    }

    if (req.body.status) {
        // If approving and not already approved, add points
        if (req.body.status === "approved" && transfer.status !== "approved") {
            if (transfer.amount > 0) {
                await createUsersModel.findByIdAndUpdate(transfer.student, {
                    $inc: { point: transfer.amount }
                });
            }
        }
        
        transfer.status = req.body.status;
        await transfer.save();
    }

    res.status(200).json({ status: "success", data: transfer });
});

// @desc    Delete transfer
// @route   DELETE /api/v1/transfer/:id
// @access  Private/Teacher
exports.deleteTransfer = expressAsyncHandler(async (req, res, next) => {
    const transfer = await createTransferModel.findOneAndDelete({ 
        _id: req.params.id, 
        teacher: req.user._id 
    });

    if (!transfer) {
        return next(new ApiError("Transfer not found", 404));
    }

    // Optional: Delete image file
    // const imagePath = path.join(uploadDir, transfer.image.split("/").pop());
    // if(fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    res.status(204).json({ status: "success", data: null });
});
