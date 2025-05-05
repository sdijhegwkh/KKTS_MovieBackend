// index.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes.js');
const bookingRoutes = require('./routes/bookingRoutes.js');
const movieRoutes = require('./routes/movieRoutes.js'); // Gộp thêm
const ticketRoutes = require('./routes/ticketRoutes.js');
const userRoutes = require('./routes/userRoutes.js');   // Gộp thêm

dotenv.config(); // Đọc file .env

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Để xử lý các request JSON

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Kết nối MongoDB thành công'))
.catch((err) => console.error('Lỗi kết nối MongoDB:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/movies', movieRoutes); // movie route
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);   // user route

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
