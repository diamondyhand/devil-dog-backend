const { add } = require("winston");
const SOCKET_CONSTS = require('./sockProc');

class SocketManager {
    constructor() {
        this.sockets = {}; // address: socket
        this.battles = {}; // productId : [address]
        this.rooms = {};
        this.allCards = ["bite", "grab", "ability", "parry"];
        this.roomId = "";
    }

    enterBattle(socket, id, address, battleType) {
        if (!address) return;
        this.sockets[id] = socket;

        if (this.battles[battleType]) {
            for (const itr of this.battles[battleType]) {
                this.sockets[itr.id].emit(SOCKET_CONSTS.ADD_PLAYER, JSON.stringify({ address }))
            }
        }

        this.battles[battleType] = this.battles[battleType] ? [...this.battles[battleType], { id, address }] : [{ id, address }];

        let rooms = [];
        for (let room in this.rooms) {
            if (room.startsWith(battleType)) {
                const _room = this.rooms[room];
                if ( _room.creater && _room.joiner ) {
                    rooms.push({
                        id: room,
                        address1: _room.creater ? _room.creater.address : 'empty',
                        address2: _room.joiner ? _room.joiner.address : 'empty',
                        nftUrl1: (_room.creater && _room.creater.nft) ? _room.creater.nft.nft.img : '',
                        nftUrl2: (_room.joiner && _room.joiner.nft) ? _room.joiner.nft.nft.img : '',
                        status: _room.roomstatus,
                        visitorNumber: 0
                    });
                }                
            }
        }
        socket.emit(SOCKET_CONSTS.GET_PLAYERS, JSON.stringify({ joiners: this.battles[battleType], _rooms: rooms }));
    }

    enterRoom(socket, id, address, battleType) {
        console.log("address ====",address)
        this.sockets[id] = socket;
        this.battles[battleType] = this.battles[battleType] ? [...this.battles[battleType], { id, address }] : [{ id, address }];

        let rooms = [];
        for (let room in this.rooms) {
            if (room.startsWith(battleType)) {
                const _room = this.rooms[room];
                rooms.push({
                    id: room,
                    address1: _room.creater ? _room.creater.address : 'empty',
                    address2: _room.joiner ? _room.joiner.address : 'empty',
                    nftUrl1: (_room.creater && _room.creater.nft) ? _room.creater.nft.nft.img : '',
                    nftUrl2: (_room.joiner && _room.joiner.nft) ? _room.joiner.nft.nft.img : '',
                    status: _room.roomstatus,
                    visitorNumber: 0
                });
            }
        }
        socket.emit(SOCKET_CONSTS.ENTER_ROOM, JSON.stringify({ joiners: this.battles[battleType], _rooms: rooms }));
    }

    confirmRoom(data, socketId) {
        const { roomId } = data;
        this.roomId = roomId;
        console.log("roomId ====", roomId)
        // console.log("rooms ====", this.rooms)
        if (this.rooms[roomId]) {
            console.log("join room ====")
            this.joinPit(data, socketId);
        } else {
            console.log("create room ====")
            this.createPit(data, socketId);
        }
        // console.log(this.rooms[roomId])
        const battleType = roomId.split('_')[0];
        const _room = this.rooms[roomId];
        for (let item of this.battles[battleType]) {

            if (item && item.id) {
                this.sockets[item.id].emit(SOCKET_CONSTS.ADD_ROOM, JSON.stringify({
                    newRoom: {
                        id: roomId,
                        address1: _room.creater ? _room.creater.address : 'empty',
                        address2: _room.joiner ? _room.joiner.address : 'empty',
                        nftUrl1: (_room.creater && _room.creater.nft) ? _room.creater.nft.nft.img : '',
                        nftUrl2: (_room.joiner && _room.joiner.nft) ? _room.joiner.nft.nft.img : '',
                        status: _room.roomstatus,
                        visitorNumber: 0
                    }
                }))
            }
        }
    }

    createPit(data, socketId) {
        // console.log("==================create===================")
        // console.log(data)
        const { roomId, address } = data;
        this.rooms[roomId] = {
            creater: {
                address,
                socketId,
                nft: null,
                hp: 0,
                status: false,
                time: 0,
                endTurn: false
            },
            joiner: null,
            roomstatus: false,
        }
        // this.sockets[socketId].emit('pitCreated', JSON.stringify({ ...this.rooms[roomId] }));

    }

    joinPit(data, socketId) {
        // console.log("==================join===================")
        const { roomId, address } = data;
        // console.log(this.rooms[roomId])
        if (this.rooms[roomId].creater && this.rooms[roomId].joiner) {
            console.log("reconnect")

            if (this.rooms[roomId].creater.address === address) {
                const creater = this.rooms[roomId].creater;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    creater: {
                        ...creater,
                        socketId
                    }

                };
                if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId) {
                    this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.CONFIRM_CREATOR, JSON.stringify({ ...this.rooms[roomId] }));
                }
                if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId]) {
                    this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.CONFIRM_JOINER, JSON.stringify({ ...this.rooms[roomId] }));
                }
                if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId]) {
                    this.pitReady({ ...data, "nft" : this.rooms[roomId].creater.nft }, this.rooms[roomId].creater.socketId);
                }
                return;
            } else if (this.rooms[roomId].joiner.address === address) {
                const joiner = this.rooms[roomId].joiner;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    joiner: {
                        ...joiner,
                        socketId
                    }
                };
                
                if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId]) {
                    this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.CONFIRM_CREATOR, JSON.stringify({ ...this.rooms[roomId] }));
                }
                if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId]) {
                    this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.CONFIRM_JOINER, JSON.stringify({ ...this.rooms[roomId] }));
                }
                
                // this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_READY, JSON.stringify({ hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                // this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_READY, JSON.stringify({ hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))
                // console.log(data)
                // this.pitReady({ ...data, "nft" : this.rooms[roomId].creater.nft }, this.rooms[roomId].creater.socketId);
                if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId]) {
                    this.pitReady({ ...data, "nft" : this.rooms[roomId].joiner.nft }, this.rooms[roomId].joiner.socketId);
                }
                return;
            } else {
                // for visitors
                return;
            }
        }
        // console.log("==================join1===================")
        // console.log(!this.rooms[roomId].creater)
        if ( !this.rooms[roomId].creater ) {
            if ( this.rooms[roomId].joiner && this.rooms[roomId].joiner.address === address ) {
                const joiner = this.rooms[roomId].joiner;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    joiner: {
                        ...joiner,
                        socketId
                    }
                }
            } else {
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    creater: {
                        address,
                        socketId,
                        hp: 0,
                        nft: null,
                        status: false,
                        time: 0,
                        endTurn: false
                    }
                }
            }

            if ( this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId] ) {
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.CONFIRM_CREATOR, JSON.stringify({ ...this.rooms[roomId] }));
            }
            if ( this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId] ) {
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.CONFIRM_JOINER, JSON.stringify({ ...this.rooms[roomId] }));
            }
            return;
        }
        // console.log("==================join2===================")
        // console.log(!this.rooms[roomId].joiner)
        if ( !this.rooms[roomId].joiner ) {
            if ( this.rooms[roomId].creater && this.rooms[roomId].creater.address === address ) {
                const creater = this.rooms[roomId].creater;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    creater: {
                        ...creater,
                        socketId
                    }
                }
            } else {
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    joiner: {
                        address,
                        socketId,
                        hp: 0,
                        nft: null,
                        status: false,
                        time: 0,
                        endTurn: false
                    }
                }
            }
            if ( this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId] ) {
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.CONFIRM_CREATOR, JSON.stringify({ ...this.rooms[roomId] }));
            }
            if ( this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId] ) {
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.CONFIRM_JOINER, JSON.stringify({ ...this.rooms[roomId] }));
            }
            return;
        } else {
        }
    }

    pitReady(data, socketId) {
        const { roomId, address, nft } = data;
        this.sockets[socketId].emit('pitReadyAccepted', JSON.stringify({ success: true }))
        if (this.rooms[roomId].creater && this.rooms[roomId].creater.address === address) {
            if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.status === true) {
                console.log("=============1")
                const creater = this.rooms[roomId].creater;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    roomstatus: true,
                    creater: {
                        ...creater,
                        status: true,
                        nft: {
                            ...nft
                        },
                        hp: nft.hp,
                        bp: nft.bp,
                        sp: nft.sp,
                        ep: nft.ep,
                        st: nft.st
                    },
                }

                if ( this.sockets[this.rooms[roomId].creater.socketId] )
                    this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                if ( this.sockets[this.rooms[roomId].joiner.socketId] )
                    this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))

                return;
            } else {
                console.log("=============2")

                const creater = this.rooms[roomId].creater;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    roomstatus: false,
                    creater: {
                        ...creater,
                        status: true,
                        nft: {
                            ...nft
                        },
                        hp: nft.hp || 0,
                        bp: nft.bp || 0,
                        sp: nft.sp || 0,
                        ep: nft.ep || 0,
                        st: nft.st || 0
                    }

                }
                if (this.rooms[roomId].joiner) {
                    console.log("=============3")

                    this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_READY, JSON.stringify({ hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))
                }
                return;
            }

        }
        if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.address === address) {

            if (this.rooms[roomId].creater.status === true) {
                console.log("=============4")
                //
                const joiner = this.rooms[roomId].joiner;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    joiner: {
                        ...joiner,
                        status: true,
                        roomstatus: true,
                        nft: {
                            ...nft
                        },
                        hp: nft.hp,
                        bp: nft.bp,
                        sp: nft.sp,
                        ep: nft.ep,
                        st: nft.st
                    },
                }

                if ( this.sockets[this.rooms[roomId].creater.socketId] )
                    this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                if ( this.sockets[this.rooms[roomId].joiner.socketId] )
                    this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))

                return;
            } else {
                console.log("=============5")

                const joiner = this.rooms[roomId].joiner;
                this.rooms[roomId] = {
                    ...this.rooms[roomId],
                    joiner: {
                        ...joiner,
                        status: true,
                        roomstatus: false,
                        nft: {
                            ...nft
                        },
                        hp: nft.hp || 0,
                        bp: nft.bp || 0,
                        sp: nft.sp || 0,
                        ep: nft.ep || 0,
                        st: nft.st || 0
                    },
                }
                if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId]) {
                    this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_READY, JSON.stringify({ hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                }
            }

        }
    }

    selectAcitonCard(data) {
        const { roomId, address, cardType, counterTime } = data;
        this.rooms[roomId].creater.endTurn = false;
        this.rooms[roomId].joiner.endTurn = false;

        // console.log("selectAcitonCard => ")
        let shuffleArray = [];
        for (let i = 0; i < 6; i++) {
            shuffleArray.push([0, 1, 2, 3, 4].sort(() => Math.random() - 0.5));
        }
        let shuffleCards = shuffleArray[5];

        if (this.rooms[roomId].creater.address === address) {
            // console.log(this.sockets[this.rooms[roomId].joiner.socketId]);
            if ( this.sockets[this.rooms[roomId].joiner.socketId] ) {
                this.rooms[roomId].creater.time = this.rooms[roomId].creater.time + counterTime;
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.SELECT_AC, JSON.stringify({ cardType, shuffleCards, flag: 1 }))
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.SELECT_AC, JSON.stringify({ cardType, shuffleCards, flag: 0 }));
            } else {
                console.log("joiner disconnected");
                // this.sockets[this.rooms[roomId].creater.socketId].emit('pitReadyAccepted', JSON.stringify({success: false}))
                // this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_STOP, JSON.stringify({ hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                return;
                
            }
        } else {
            if ( this.sockets[this.rooms[roomId].creater.socketId] ) {
                this.rooms[roomId].joiner.time = this.rooms[roomId].joiner.time + counterTime;
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.SELECT_AC, JSON.stringify({ cardType, shuffleCards, flag:1 }))
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.SELECT_AC, JSON.stringify({ cardType, shuffleCards, flag: 0 }));
            } else {
                console.log("creater disconnected");
                // this.sockets[this.rooms[roomId].joiner.socketId].emit('pitReadyAccepted', JSON.stringify({success: false}))
                // this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_STOP, JSON.stringify({ hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))
                return;
            }
        }
    }

    compareCard(data) {
        const { roomId, address, cardType, opponentCard, gameTime } = data;

        // console.log("compareCard => ")
        if (this.rooms[roomId].creater.address === address) {
            this.rooms[roomId].creater.time = this.rooms[roomId].creater.time + gameTime;
            this.rooms[roomId].creater.endTurn = true;
            if (cardType === opponentCard) {
                switch (opponentCard) {
                    case "bite":
                        if (this.rooms[roomId].joiner.sp <= 0) {
                            this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 20;       // original 1 per sp
                        } else {
                            this.rooms[roomId].joiner.sp = this.rooms[roomId].joiner.sp - 2;
                        }
                        if (this.rooms[roomId].creater.ep <= 0) {
                            this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 10      //original 1
                        } else {
                            this.rooms[roomId].creater.ep = this.rooms[roomId].creater.ep - 1;
                        }
                        break;
                    case "grab":
                        this.rooms[roomId].creater.st = this.rooms[roomId].creater.st + 1;

                        break;
                    case "flip":
                        break;
                    case "mount":
                        if (this.rooms[roomId].joiner.sp <= 0) {
                            this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 100;       //original 2 per sp
                        } else {
                            this.rooms[roomId].joiner.sp = this.rooms[roomId].joiner.sp - 5;
                        }
                        if (this.rooms[roomId].creater.ep <= 0) {
                            this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 20       //original 1 per ep
                        } else {
                            this.rooms[roomId].creater.ep = this.rooms[roomId].creater.ep - 2;
                        }
                        break;
                    case "shake":
                        break;

                    default:
                        break;
                }
            } else {
                switch (opponentCard) {
                    case "bite":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - (this.rooms[roomId].joiner.bp / 10);
                        if (this.rooms[roomId].joiner.sp <= 0) {
                            this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 10
                        } else {
                            this.rooms[roomId].joiner.sp = this.rooms[roomId].joiner.sp - 1;
                        }
                        if (this.rooms[roomId].creater.ep <= 0) {
                            this.rooms[roomId].creater.hp = this.rooms[roomId].hp - 20
                        } else {
                            this.rooms[roomId].creater.ep = this.rooms[roomId].creater.ep - 2;
                        }
                        break;
                    case "grab":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - (this.rooms[roomId].joiner.bp * 0.2);
                        break;
                    case "flip":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - (this.rooms[roomId].joiner.bp* 0.3);
                        break;
                    case "mount":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - (this.rooms[roomId].joiner.bp * 0.4);
                        if (this.rooms[roomId].joiner.sp <= 0) {
                            this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 100;       //original 2 per sp
                        } else {
                            this.rooms[roomId].joiner.sp = this.rooms[roomId].joiner.sp - 5;
                        }
                        break;
                    case "shake":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - (this.rooms[roomId].joiner.bp * 0.5);
                        break;

                    default:
                        break;
                }
            }

            if ( this.sockets[this.rooms[roomId].joiner.socketId] ) {
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.SHOW_RESULT, JSON.stringify({
                    hp: {
                        creater: this.rooms[roomId].creater.hp,
                        joiner: this.rooms[roomId].joiner.hp,
                    },
                    sp: {
                        creater: this.rooms[roomId].creater.sp,
                        joiner: this.rooms[roomId].joiner.sp,
                    },
                    ep: {
                        creater: this.rooms[roomId].creater.ep,
                        joiner: this.rooms[roomId].joiner.ep,
                    },
                    st: {
                        creater: this.rooms[roomId].creater.st,
                        joiner: this.rooms[roomId].joiner.st,
                    },
                    endTurn: this.rooms[roomId].creater.endTurn
                }))
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.SHOW_RESULT, JSON.stringify({
                    hp: {
                        creater: this.rooms[roomId].creater.hp,
                        joiner: this.rooms[roomId].joiner.hp,
                    },
                    sp: {
                        creater: this.rooms[roomId].creater.sp,
                        joiner: this.rooms[roomId].joiner.sp,
                    },
                    ep: {
                        creater: this.rooms[roomId].creater.ep,
                        joiner: this.rooms[roomId].joiner.ep,
                    },
                    st: {
                        creater: this.rooms[roomId].creater.st,
                        joiner: this.rooms[roomId].joiner.st,
                    },
                    endTurn: this.rooms[roomId].joiner.endTurn,
                    cardType: cardType
                }))
            } else {
                console.log("joiner disconnected");
                // this.sockets[this.rooms[roomId].creater.socketId].emit('pitReadyAccepted', JSON.stringify({success: false}))
                // this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_STOP, JSON.stringify({ hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                return;
            }
            // this.sockets[this.rooms[roomId].creater.socketId].emit()
        } else {
            this.rooms[roomId].joiner.time = this.rooms[roomId].joiner.time + gameTime;
            this.rooms[roomId].joiner.endTurn = true;

            if (cardType === opponentCard) {
                switch (opponentCard) {
                    case "bite":
                        if (this.rooms[roomId].creater.sp <= 0) {
                            this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 20;       // original 1 per sp
                        } else {
                            this.rooms[roomId].creater.sp = this.rooms[roomId].creater.sp - 2;
                        }
                        if (this.rooms[roomId].joiner.ep <= 0) {
                            this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 10      //original 1
                        } else {
                            this.rooms[roomId].joiner.ep = this.rooms[roomId].joiner.ep - 1;
                        }
                        break;
                    case "grab":
                        this.rooms[roomId].joiner.st = this.rooms[roomId].joiner.st + 1;

                        break;
                    case "flip":
                        break;
                    case "mount":
                        if (this.rooms[roomId].creater.sp <= 0) {
                            this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 100;       //original 2 per sp
                        } else {
                            this.rooms[roomId].creater.sp = this.rooms[roomId].creater.sp - 5;
                        }
                        if (this.rooms[roomId].joiner.ep <= 0) {
                            this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 20       //original 1 per ep
                        } else {
                            this.rooms[roomId].joiner.ep = this.rooms[roomId].joiner.ep - 2;
                        }
                        break;
                    case "shake":
                        break;

                    default:
                        break;
                }
            } else {
                switch (opponentCard) {
                    case "bite":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - (this.rooms[roomId].creater.bp *0.1);
                        if (this.rooms[roomId].creater.sp <= 0) {
                            this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 10
                        } else {
                            this.rooms[roomId].creater.sp = this.rooms[roomId].creater.sp - 1;
                        }
                        if (this.rooms[roomId].joiner.ep <= 0) {
                            this.rooms[roomId].joiner.hp = this.rooms[roomId].hp - 20
                        } else {
                            this.rooms[roomId].joiner.ep = this.rooms[roomId].joiner.ep - 2;
                        }
                        break;
                    case "grab":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - (this.rooms[roomId].creater.bp * 0.2);
                        break;
                    case "flip":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - (this.rooms[roomId].creater.bp * 0.3);
                        break;
                    case "mount":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - (this.rooms[roomId].creater.bp * 0.4);
                        if (this.rooms[roomId].creater.sp <= 0) {
                            this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 100;       //original 2 per sp
                        } else {
                            this.rooms[roomId].creater.sp = this.rooms[roomId].creater.sp - 5;
                        }
                        break;
                    case "shake":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - (this.rooms[roomId].creater.bp * 0.5);
                        break;

                    default:
                        break;
                }
            }

            if ( this.sockets[this.rooms[roomId].creater.socketId] ) {
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.SHOW_RESULT, JSON.stringify({
                    hp: {
                        creater: this.rooms[roomId].creater.hp,
                        joiner: this.rooms[roomId].joiner.hp,
                    },
                    sp: {
                        creater: this.rooms[roomId].creater.sp,
                        joiner: this.rooms[roomId].joiner.sp,
                    },
                    ep: {
                        creater: this.rooms[roomId].creater.ep,
                        joiner: this.rooms[roomId].joiner.ep,
                    },
                    st: {
                        creater: this.rooms[roomId].creater.st,
                        joiner: this.rooms[roomId].joiner.st,
                    },
                    endTurn: this.rooms[roomId].creater.endTurn,
                    cardType: cardType
                }))
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.SHOW_RESULT, JSON.stringify({
                    hp: {
                        creater: this.rooms[roomId].creater.hp,
                        joiner: this.rooms[roomId].joiner.hp,
                    },
                    sp: {
                        creater: this.rooms[roomId].creater.sp,
                        joiner: this.rooms[roomId].joiner.sp,
                    },
                    ep: {
                        creater: this.rooms[roomId].creater.ep,
                        joiner: this.rooms[roomId].joiner.ep,
                    },
                    st: {
                        creater: this.rooms[roomId].creater.st,
                        joiner: this.rooms[roomId].joiner.st,
                    },
                    endTurn: this.rooms[roomId].joiner.endTurn
                }))
            } else {
                console.log("creater disconnected");
                // this.sockets[this.rooms[roomId].joiner.socketId].emit('pitReadyAccepted', JSON.stringify({success: false}))
                // this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_STOP, JSON.stringify({ hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))
                return;
            }
        }


        // winner or loser
        // console.log(this.rooms[roomId])

        if ((this.rooms[roomId].creater.hp < 0 || this.rooms[roomId].creater.hp === NaN) && (this.rooms[roomId].joiner.hp > 0)) {
            this.rooms[roomId].creater.endTurn = false;
            this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.WIN_OR_LOSE, JSON.stringify({ winner: "joiner", loser: "creater" }));
            this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.WIN_OR_LOSE, JSON.stringify({ winner: "joiner", loser: "creater" }));
        } else if ((this.rooms[roomId].joiner.hp < 0 || this.rooms[roomId].joiner.hp === NaN) && (this.rooms[roomId].creater.hp > 0)) {
            this.rooms[roomId].joiner.endTurn = false;

            this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.WIN_OR_LOSE, JSON.stringify({ winner: "creater", loser: "joiner" }));
            this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.WIN_OR_LOSE, JSON.stringify({ winner: "creater", loser: "joiner" }));
        }

        // repeat turn
        if (this.rooms[roomId].creater.endTurn == true && this.rooms[roomId].joiner.endTurn == true) {
            // console.log("new turn???")
            this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.NEW_TURN);
            this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.NEW_TURN);
        }
    }

    quitBattle(socket, id, address, battleType) {
        if (this.battles[battleType])
            this.battles[battleType] = this.battles[battleType].filter(item => item.id !== id);
        if (this.battles[battleType]) {
            for (const itr of this.battles[battleType]) {
                // this.sockets[itr.id].emit('quitBattle', JSON.stringify({ address }))
            }
        }
        delete this.sockets[id];
    }
    quitRoom(data) {
        const { roomId, address } = data;
        if (this.rooms[roomId] && this.rooms[roomId].creater && this.rooms[roomId].creater.address === address) {
            this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.QUIT_ROOM);

            if (this.rooms[roomId].joiner && this.sockets[this.rooms[roomId].joiner.socketId]) {
                this.sockets[this.rooms[roomId].joiner.socketId].emit('opponentPit', JSON.stringify({ msg: `${address}????? creater quit` }))
            }
            this.rooms[roomId] = {
                ...this.rooms[roomId],
                creater: null,
                roomstatus: false
            }
        }

        if (this.rooms[roomId] && this.rooms[roomId].joiner && this.rooms[roomId].joiner.address === address) {
            this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.QUIT_ROOM);

            if (this.rooms[roomId].creater && this.sockets[this.rooms[roomId].creater.socketId]) {
                this.sockets[this.rooms[roomId].creater.socketId].emit('opponentPit', JSON.stringify({ msg: `${address}????? joiner quit` }))
            }
            this.rooms[roomId] = {
                ...this.rooms[roomId],
                joiner: null,
                roomstatus: false
            }

        }

        // if (this.rooms[roomId] && this.rooms[roomId].joiner && this.rooms[roomId].joiner.address === address) {
        //     console.log("======================================joiner logout")
        //     this.sockets[this.rooms[roomId].joiner.socketId].emit('opponentPit', JSON.stringify({ msg: `${address} quitted this room` }))
        //     if (this.rooms[roomId].creater && this.sockets[this.rooms[roomId].creater.socketId]) {
        //         this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.QUIT_ROOM, JSON.stringify({ msg: `${address} quitted this room` }))
        //     }
        //     this.rooms[roomId] = {
        //         ...this.rooms[roomId],
        //         joiner: null,
        //         roomstatus: false
        //     }
        //     return;
        // }
        if (!this.rooms[roomId]) {

        } else if (this.rooms[roomId].joiner === null && this.rooms[roomId].creater === null) {
        // } else if (this.rooms[roomId].creater === null) {
        // } else {
            delete this.rooms[roomId];
            // console.log(roomId);
            const battleType = roomId.split('_')[0];
            for (let item of this.battles[battleType]) {
                if (item && item.id) {
                    // console.log(item.id);
                    this.sockets[item.id].emit(SOCKET_CONSTS.REMOVE_ROOM, JSON.stringify({ msg: 'room deleted', roomId: roomId }))
                }
            }
        }

    }
    disconnect(id, battleType) {
        delete this.sockets[id];
        if (battleType && this.battles[battleType] && this.battles[battleType].length > 0) {
            this.battles[battleType] = this.battles[battleType].filter(item => item.id !== id);
        }
        // this.products = { ...this.products, ['product_' + productId]: this.products['product_' + productId].filter(_id => _id !== id) };

        console.log("disconnect room id => ", this.roomId)
        if ( this.roomId != "" && this.rooms[this.roomId] && this.rooms[this.roomId].creater && this.rooms[this.roomId].creater.socketId == id ) {
            console.log("creater disconnected")
            // if ( this.rooms[this.roomId] ) {
            //     this.rooms[this.roomId] = {
            //         creater: null,
            //         roomstatus: false,
            //     }
            // }

            if ( this.rooms[this.roomId].joiner && this.sockets[this.rooms[this.roomId].joiner.socketId] )
                this.sockets[this.rooms[this.roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_STOP, JSON.stringify({ roomId: this.roomId }))
        }

        if ( this.roomId != "" && this.rooms[this.roomId] && this.rooms[this.roomId].joiner && this.rooms[this.roomId].joiner.socketId == id ) {
            console.log("joiner disconnected")
            // if ( this.rooms[this.roomId] ) {
            //     this.rooms[this.roomId] = {
            //         joiner: {
            //             address: 'empty',
            //             socketId: '',
            //             nft: null,
            //             hp: 0,
            //             status: false,
            //             time: 0,
            //             endTurn: false
            //         },
            //         roomstatus: false,
            //     }
            // }

            if ( this.rooms[this.roomId].creater && this.sockets[this.rooms[this.roomId].creater.socketId] )
                this.sockets[this.rooms[this.roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_STOP, JSON.stringify({ roomId: this.roomId }))
        }
    }
}

module.exports = SocketManager;