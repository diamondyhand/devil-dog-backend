const mongoose = require('mongoose');

const playerSchema = mongoose.Schema({
    address: {
        type: String,
    },
    socketId: {
        type: String
    },
    status: {
        type: Boolean
    }
});


const Player = mongoose.model('Player', playerSchema);

module.exports = Player;