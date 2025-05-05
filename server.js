const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const movieRoutes = require('./routes/movieRoutes'); // Thêm movieRoutes
const ticketRoutes = require('./routes/ticketRoutes'); // Thêm ticketRoutes
const userRoutes = require('./routes/userRoutes'); 

dotenv.config();

const app = express();
app.use(express.json()); // Xử lý dữ liệu JSON từ request
app.use(cors());

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Kết nối MongoDB thành công'))
  .catch((err) => console.error('Lỗi kết nối MongoDB:', err));

app.use('/api/auth', authRoutes); // Route cho auth
app.use('/api/booking', bookingRoutes); // Route cho bookings
app.use('/api/movies', movieRoutes); // Route cho movies
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes); // Route cho ticket
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});