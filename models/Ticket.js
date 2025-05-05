const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    ticket_id:{
        type: String,
        required: true,
    },
    booking_id:{
        type: String,
        required: true,
    },
    ticket_price:{
        type:Number,
        required: true,
    },
    seat_id:{
        type: String,
        required: true,
    },
    status:{
        type: String,
        enum: ['upcoming', 'ischeckedIn', 'canceled'],
        default: 'upcoming',
    }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;