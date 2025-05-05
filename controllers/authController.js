const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Đăng ký
const registerUser = async (req, res) => {
    const { name, phone, password, confirmPassword } = req.body;

    // Kiểm tra mật khẩu và xác nhận mật khẩu
    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Mật khẩu không khớp" });
    }

    try {
        // Kiểm tra số điện thoại đã tồn tại chưa
        const userExists = await User.findOne({ phone });
        if (userExists) {
            return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo người dùng mới
        const newUser = new User({
            name,
            phone,
            password: hashedPassword
        });

        // Lưu người dùng mới vào cơ sở dữ liệu
        await newUser.save();
        return res.status(201).json({ message: "Đăng ký thành công" });

    } catch (err) {
        console.error(err); // In lỗi ra console để kiểm tra
        return res.status(500).json({ message: "Lỗi server" });
    }
};

const loginUser = async (req, res) => {
    const { phone, password, isAdmin } = req.body;

    try {
        const user = await User.findOne({ phone });

        // Kiểm tra xem người dùng có tồn tại không
        if (!user) {
            return res.status(400).json({ message: "Số điện thoại không tồn tại" });
        }
        console.log(user); // In người dùng ra console để kiểm tra
        
        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(isMatch); // In kết quả so sánh mật khẩu ra console để kiểm tra
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu không chính xác!" });
        }

        // Tạo JWT token nếu mật khẩu đúng
        const token = jwt.sign({ id: user._id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: "1h" });

        return res.status(200).json({
            message: "Đăng nhập thành công",
            token: token, // Gửi token về client
            user:{
                name: user.name,
                phone: user.phone,
                isAdmin: user.isAdmin // Thêm thông tin isAdmin nếu cần
            }
        });
    } catch (err) {
        console.error(err); // In lỗi ra console để kiểm tra
        return res.status(500).json({ message: "Lỗi server" });
    }
}


const updateUser = async (req, res) => {
  const { name, phone, password, confirmPassword } = req.body;
  const userId = req.user.phone; // Lấy từ middleware protectRoute

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!name || !phone) {
      return res.status(400).json({ message: "Tên và số điện thoại là bắt buộc" });
    }

    // Tìm người dùng
    let user = await User.findOne({phone: userId});
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Cập nhật số điện thoại nếu thay đổi
    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
      }
      user.phone = phone;
    }

    // Cập nhật tên
    user.name = name;

    // Cập nhật mật khẩu nếu có
    if (password) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Mật khẩu không khớp" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Lưu người dùng
    await user.save();

    // Trả về phản hồi
    return res.status(200).json({
      message: "Cập nhật thành công",
      user: {
        name: user.name,
        phone: user.phone,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error(err.stack); // In chi tiết lỗi
    return res.status(500).json({ message: "Lỗi server: " + err.message });
  }
};

module.exports = { registerUser, loginUser, updateUser };

module.exports = {
    registerUser,
    loginUser,
    updateUser
};
