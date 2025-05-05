const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    bookingId:{
        type: String,
        required: true,
    },
    userId:{
        type: String,
        required: true,
    },
    movieID:{
        type: Number,
        required: true,
    },
    movieTitle:{
        type:String,
        required: true,
    },
    seats:[
        {
            seat_id:{
                type: String,
                required: true,
            },
            status:{
                type: String,
                enum: ['booked', 'available'],
                default: 'available',
            }
        }
    ],
    booking_time:{
        type: Date,
        default: Date.now,
    },
    date: {
        type: String, // Lưu định dạng ngày, ví dụ: "Thứ 3, 26/4"
        required: true,
    },
    time: {
        type: String, // Lưu giờ, ví dụ: "10:00"
        required: true,
    },
    address:{
        type: String,
        required: true,
    },
    foods:[
        {
            food_id:{
                type:String,
                required: true,
            },
            food_name:{
                type: String,
                required: true,
            },
            food_price:{
                type: Number,
                required: true,
            },        
            quantity:{
                type: Number,
                required: true,
            }
        }
    ],
    total_price:{
        type: Number,
        required: true,
    },
    order_status: {
        type: String,
        enum: ['ordered', 'canceled'],
        default: 'ordered',
    },
    poster_path:{
        type: String,
        required: false,
    }
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
