const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');

const createTicket = async (req, res) => {

    const{ticket_id, booking_id, ticket_price, seat_id, status} = req.body;
     
    const newTicket = new Ticket({
        ticket_id,
        booking_id,
        ticket_price,
        seat_id,
        status
    });

    await newTicket.save();
    console.log('Đã tạo vé:', newTicket ); // log ra booking data

    return res.status(201).json({ message: "Đã tạo vé", ticket: newTicket });
};

const getTicketByBookingId = async (req, res) => {
    const { booking_id } = req.params;
  
    try {
      // Tìm các vé có cùng booking_id
      const tickets = await Ticket.find({ booking_id });
  
      if (!tickets || tickets.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy vé cho booking này" });
      }
  
      return res.status(200).json({ tickets });
    } catch (err) {
      console.error("Lỗi khi lấy vé:", err);
      return res.status(500).json({ message: "Lỗi server, vui lòng thử lại sau." });
    }
  };

  const cancelTicket = async (req, res) => {
    const { ticket_id } = req.params;
  
    try {
      const ticket = await Ticket.findOne({ ticket_id });
      if (!ticket) {
        return res.status(404).json({ message: 'Vé không tồn tại' });
      }
  
      ticket.status = 'cancelled'; // hoặc 'huy', tùy bạn định nghĩa
      await ticket.save();
  
      return res.status(200).json({ message: 'Đã hủy vé thành công', ticket });
    } catch (err) {
      console.error('Lỗi hủy vé:', err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  };
module.exports = { createTicket, getTicketByBookingId, cancelTicket };