const express = require("express");
const {registerUser, loginUser, updateUser} = require("../controllers/authController");
const { protectRoute } = require("../middlewave/authMiddlewave.js");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/update", protectRoute, updateUser)

module.exports = router;

