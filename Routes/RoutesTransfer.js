const { Router } = require("express");
const { protect, allowedTo } = require("../Service/AuthService");
const {
  uploadTransferImage,
  resizeTransferImage,
  createTransfer,
  getMyTransfers,
  updateTransferStatus,
  deleteTransfer
} = require("../Service/TransferService");

const Routes = Router();

Routes.use(protect);

Routes.route("/transfer")
  .post(
    allowedTo("user", "student"), // Allow students to upload
    uploadTransferImage,
    resizeTransferImage,
    createTransfer
  );

Routes.route("/transfer/me")
  .get(
    allowedTo("teacher", "user"),
    getMyTransfers
  );

Routes.route("/transfer/:id")
  .put(allowedTo("teacher"), updateTransferStatus)
  .delete(allowedTo("teacher"), deleteTransfer);

module.exports = Routes;
