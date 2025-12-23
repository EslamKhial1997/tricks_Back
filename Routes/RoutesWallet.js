const { Router } = require("express");
const {
  createWallet,
  getMyWallets,
  updateMyWallet,
  deleteMyWallet,
  getAllWallets,
  getWallet,
  updateWallet,
  deleteWallet,
} = require("../Service/WalletService");

const { protect, allowedTo } = require("../Service/AuthService");

const Routes = Router();

Routes.use(protect);

// My Wallet Routes (Teacher/Manager)
Routes.route("/wallet/me")
  .get(allowedTo("teacher", "manager"), getMyWallets)
  .post(allowedTo("teacher"), createWallet);

Routes.route("/wallet/me/:id")
  .put(allowedTo("teacher"), updateMyWallet)
  .delete(allowedTo("teacher"), deleteMyWallet);

// Admin/Manager Routes
Routes.route("/wallet")
  .get(allowedTo("manager", "admin"), getAllWallets)
  .post(allowedTo("manager", "admin"), createWallet);

Routes.route("/wallet/:id")
  .get(allowedTo("manager", "admin"), getWallet)
  .put(allowedTo("manager", "admin"), updateWallet)
  .delete(allowedTo("manager", "admin"), deleteWallet);

module.exports = Routes;
