const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking'); // Model booking bạn đã làm
const Ticket = require('../models/Ticket'); // Model ticket bạn đã làm
const jwt = require('jsonwebtoken');

// Middleware kiểm tra token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });
  
      req.user = user; // Gán thông tin user đã giải mã vào req
      next();
    });
  };
  
  router.post('/create', authenticate, async (req, res) => {
    try {
      const { ticket_id, booking_id, ticket_price, seat_id, status } = req.body;
  
      console.log('Ticket Data:', req.body); // Kiểm tra dữ liệu gửi đến server
  
      const newTicket = new Ticket({
        ticket_id, 
        booking_id, 
        ticket_price, 
        seat_id,
        status,
      });
  
      await newTicket.save();
  
      res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket });
    } catch (error) {
      console.error('Error creating ticket:', error); // Log lỗi chi tiết
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/getTicketByBookingId/:bookingId', authenticate, async (req, res) => {
    try {
      const bookingId = req.params.bookingId;  // Lấy userId từ params
  
    
  
      // Tìm tất cả booking của userId
      const tickets = await Ticket.find({ booking_id: bookingId });
  
      if (tickets.length === 0) {
        return res.status(404).json({ message: 'Không có vé nào' });
      }
  
      res.status(200).json(tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

    router.patch('/cancelTicket/:bookingId', authenticate, async (req, res) => {
      try {
        const bookingId = req.params.bookingId;
    
        const tickets = await Ticket.find({ booking_id: bookingId });
        if (tickets.length === 0) {
          return res.status(404).json({ message: 'Không có vé nào để hủy' });
        }
    
        await Ticket.updateMany({ booking_id: bookingId }, { status: 'cancelled' });
    
        res.status(200).json({ message: 'Tất cả vé đã được hủy thành công' });
      } catch (error) {
        console.error('Error canceling tickets:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });
    router.get('/stats', async (req, res) => {
      try {
        const totalTickets = await Ticket.countDocuments();
        console.log(`Total tickets counted: ${totalTickets}`); // Log để debug
        res.json({ totalTickets });
      } catch (error) {
        console.error('Error fetching ticket stats:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch ticket stats' });
      }
    });
    
    module.exports = router;
  
  module.exports = router;
  