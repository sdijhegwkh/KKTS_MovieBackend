const mongose = require('mongoose');

const userChema = new mongose.Schema({
    name:{
        type: String,
        required: true,
    },
    phone:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
    isAdmin:{
        type: Boolean,
        default: false,
    },
});

const User = mongose.model('User', userChema);

module.exports = User;