const mongoose = require('mongoose');

const roomSchema = mongoose.Schema(
  {
    creater: {
        address: {
            type: String,
        },
        socketId: {
            type: String
        },
        status: {
            type: Boolean
        },
        nft: {
            bp: {
                type: Number,
                default: 0
            },
            ep: {
                type: Number,
                default: 0
            },
            hp: {
                type: Number,
                default: 0
            },
            sp: {
                type: Number,
                default: 0
            },
            st: {
                type: Number,
                default: 0
            },
            breed: {
                type: String
            },
            color: {
                type: String
            },
            weight: {
                type: Number
            },
            height: {
                type: Number
            },
            name: {
                type: String
            },
            loss: {
                type: Number
            },
            win: {
                type: Number
            },
            img: {
                type: String
            }
        }
    },
    joiner: {
        address: {
            type: String,
        },
        socketId: {
            type: String
        },
        status: {
            type: Boolean
        },
        nft: {
            bp: {
                type: Number,
                default: 0
            },
            ep: {
                type: Number,
                default: 0
            },
            hp: {
                type: Number,
                default: 0
            },
            sp: {
                type: Number,
                default: 0
            },
            st: {
                type: Number,
                default: 0
            },
            breed: {
                type: String
            },
            color: {
                type: String
            },
            weight: {
                type: Number
            },
            height: {
                type: Number
            },
            name: {
                type: String
            },
            loss: {
                type: Number
            },
            win: {
                type: Number
            },
            img: {
                type: String
            }
        }
    },
    pitStatus: {
        type: Boolean
    },
    roomId: {
        type: String
    },
    battleType: {
        type: String
    }
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;