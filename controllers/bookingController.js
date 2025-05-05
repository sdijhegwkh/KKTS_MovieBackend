const Booking = require('../models/Booking');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');

const createBooking = async (req, res) => {
  const {bookingId, movieID, movieTitle, seats, address, foods, total_price, date, time, booking_time, order_status, poster_path } = req.body;
  const userObjectId = req.user._id;

  try {
    // 🔥 Tìm User để lấy số điện thoại
    const user = await User.findById(userObjectId);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    const newBooking = new Booking({
      bookingId,
      userId: user.phone,
      movieID,
      movieTitle,
      seats,
      address,
      foods,
      total_price,
      date,
      time,
      booking_time,
      order_status,
      poster_path,
    });

    await newBooking.save();

    console.log('Booking thành công:', newBooking); // log ra booking data

    return res.status(201).json({ message: "Đặt vé thành công", booking: newBooking });
  } catch (err) {
    console.error('Lỗi tạo booking:', err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getAllBookingsByUserId = async(req, res) =>{
  const userId = req.user.params;

  try{
    const bookings = await Booking.find({ userId: userId });
    if(bookings.length === 0){
      return res.status(404).json({ message: "Không tìm thấy booking nào" });
    }
    return res.status(200).json({ bookings });
  }catch(err){
    console.error('Lỗi lấy danh sách booking:', err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

const getAllBookingsByMovieId = async(req, res) =>{
  const movieId = req.user.params;

  try{
    const bookings = await Booking.find({ movieID: movieId });
    if(bookings.length === 0){
      return res.status(404).json({ message: "Không tìm thấy booking nào" });
    }
    return res.status(200).json({ bookings });
  }catch(err){
    console.error('Lỗi lấy danh sách booking:', err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

const cancelBooking = async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user?.phone; // Giả sử bạn có middleware xác thực để lấy phone

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Tìm booking
    const booking = await Booking.findOne({ bookingId }).session(session);
    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Booking không tồn tại' });
    }

    // Kiểm tra xem booking có thuộc về người dùng không
    if (booking.userId !== userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Bạn không có quyền hủy booking này' });
    }

    // Kiểm tra trạng thái booking
    if (booking.order_status === 'canceled') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Booking đã được hủy trước đó' });
    }

    // Cập nhật trạng thái booking
    booking.order_status = 'canceled';
    // Cập nhật trạng thái ghế trong booking.seats
    booking.seats = booking.seats.map((seat) => ({
      ...seat,
      status: 'available',
    }));
    await booking.save({ session });

    // Hủy tất cả ticket liên quan
    const ticketUpdateResult = await Ticket.updateMany(
      { booking_id: bookingId },
      { status: 'canceled' },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Đã hủy booking và tất cả vé liên quan',
      booking,
      ticketsCanceled: ticketUpdateResult.modifiedCount,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('Lỗi hủy booking:', err);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

const getBookingSeats = async (req, res) => {
  try {
    const {movieID, date, time, address} = req.query;
    if (!movieID || !date || !time || !address) {
      return res.status(400).json({ message: 'Thiếu thông tin' });
    }
    const bookings = await Booking.find({ 
      movieID: Number(movieID), 
      date, 
      time, 
      address,
      order_status: "ordered",
    });

    const bookingSeats = bookings.flatMap(booking => booking.seats);

    res.status(200).json({ bookingSeats });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách ghế:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
}


module.exports = { createBooking, getAllBookingsByUserId, cancelBooking, getAllBookingsByMovieId, getBookingSeats };
