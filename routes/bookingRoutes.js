const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');

// Middleware kiểm tra token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('No authorization header provided');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Invalid token:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};

// API tạo booking
router.post('/create', authenticate, async (req, res) => {
  try {
    const { bookingId, movieID, movieTitle, seats, address, foods, total_price, date, time, poster_path } = req.body;

    console.log('Booking Data:', req.body);

    const newBooking = new Booking({
      bookingId,
      userId: req.user.phone,
      movieID,
      movieTitle,
      seats,
      address,
      foods,
      total_price,
      date,
      time,
      booking_time: new Date(),
      order_status: 'ordered',
      poster_path,
    });

    await newBooking.save();

    res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/getAllBookingsByUserId/:userId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (req.user.phone !== userId) {
      return res.status(403).json({ message: 'Bạn không được phép xem đặt phòng này' });
    }

    const bookings = await Booking.find({ userId: userId });

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Không có vé nào cho người dùng này' });
    }

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/getAllBookingsByMovieId/:movieID', authenticate, async (req, res) => {
  try {
    const movieID = req.params.movieID;

    const bookings = await Booking.find({ movieID: movieID });

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Không có vé nào cho người dùng này' });
    }

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/cancelBooking/:bookingId', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bookingId = req.params.bookingId;
    const userId = req.user.phone;

    const booking = await Booking.findOne({ bookingId }).session(session);
    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Booking không tồn tại' });
    }

    if (booking.userId !== userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Bạn không có quyền hủy booking này' });
    }

    if (booking.order_status === 'canceled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Booking đã được hủy trước đó' });
    }

    booking.order_status = 'canceled';
    booking.seats = booking.seats.map((seat) => ({
      ...seat,
      status: 'available',
    }));
    await booking.save({ session });

    const updatedTickets = await Ticket.updateMany(
      { booking_id: bookingId },
      { status: 'canceled' },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    if (updatedTickets.modifiedCount === 0) {
      console.log(`Không có vé nào được hủy cho bookingId: ${bookingId}`);
    }

    res.status(200).json({
      message: 'Vé đã được hủy thành công',
      booking,
      ticketsCanceled: updatedTickets.modifiedCount,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error canceling booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/getBookingSeats', authenticate, async (req, res) => {
  try {
    const { movieID, date, time, address } = req.query;
    if (!movieID || !date || !time || !address) {
      return res.status(400).json({ message: 'Thiếu thông tin' });
    }
    const bookings = await Booking.find({
      movieID: Number(movieID),
      date,
      time,
      address,
      order_status: 'ordered',
    });

    const bookingSeats = bookings.flatMap((booking) => booking.seats);

    res.status(200).json({ bookingSeats });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ghế:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
});

// Route to get revenue data (no authentication)
router.get('/revenue', async (req, res) => {
  console.log('Revenue endpoint called');
  try {
    const currentDate = new Date('2025-05-02T00:00:00Z');
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const totalRevenueResult = await Booking.aggregate([
      { $match: { order_status: 'ordered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total_price' } } },
    ]);

    const monthlyRevenueResult = await Booking.aggregate([
      {
        $match: {
          order_status: 'ordered',
          booking_time: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, monthlyRevenue: { $sum: '$total_price' } } },
    ]);

    const weeklyRevenueResult = await Booking.aggregate([
      {
        $match: {
          order_status: 'ordered',
          booking_time: { $gte: startOfWeek, $lte: endOfWeek },
        },
      },
      { $group: { _id: null, weeklyRevenue: { $sum: '$total_price' } } },
    ]);

    const dailyRevenueResult = await Booking.aggregate([
      {
        $match: {
          order_status: 'ordered',
          booking_time: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      { $group: { _id: null, dailyRevenue: { $sum: '$total_price' } } },
    ]);

    const sixMonthsAgo = new Date(currentDate);
    sixMonthsAgo.setMonth(currentDate.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenueDataResult = await Booking.aggregate([
      {
        $match: {
          order_status: 'ordered',
          booking_time: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$booking_time' },
            month: { $month: '$booking_time' },
          },
          revenue: { $sum: '$total_price' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ];
    const monthlyRevenueData = [];
    let currentMonth = new Date(sixMonthsAgo);

    while (currentMonth <= currentDate) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const found = monthlyRevenueDataResult.find(
        (item) => item._id.year === year && item._id.month === month
      );
      monthlyRevenueData.push({
        month: monthNames[month - 1],
        revenue: found ? found.revenue : 0,
      });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    const response = {
      totalRevenue: totalRevenueResult[0]?.totalRevenue || 0,
      monthlyRevenue: monthlyRevenueResult[0]?.monthlyRevenue || 0,
      weeklyRevenue: weeklyRevenueResult[0]?.weeklyRevenue || 0,
      dailyRevenue: dailyRevenueResult[0]?.dailyRevenue || 0,
      monthlyRevenueData,
    };

    console.log('Revenue data:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching revenue data:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

module.exports = router;