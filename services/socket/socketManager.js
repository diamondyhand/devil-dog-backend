const { add } = require("winston");
const SOCKET_CONSTS = require('./sockProc');

class SocketManager {
    constructor() {
        this.sockets = {}; // address: socket
        this.battles = {}; // productId : [address]
        this.rooms = {};
        this.allCards = ["bite", "grab", "ability", "parry"];
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
        socket.emit(SOCKET_CONSTS.GET_PLAYERS, JSON.stringify({ joiners: this.battles[battleType], _rooms: rooms }));
    }

    enterRoom(socket, id, address, battleType) {
        
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
        socket.emit(SOCKET_CONSTS.ENTER_ROOM,  JSON.stringify({ joiners: this.battles[battleType], _rooms: rooms }));
    }

    confirmRoom(data, socketId) {
        const { roomId } = data;
        if (this.rooms[roomId]) {
            this.joinPit(data, socketId);
        } else {
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
            },
            joiner: null,
            roomstatus: false,
        }
        // this.sockets[socketId].emit('pitCreated', JSON.stringify({ ...this.rooms[roomId] }));

    }
    joinPit(data, socketId) {
        // console.log("==================join===================")
        // console.log(data)
        const { roomId, address } = data;
        if (this.rooms[roomId].creater && this.rooms[roomId].joiner) {
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
                    this.sockets[this.rooms[roomId].creater.socketId].emit("createrPit", JSON.stringify({ ...this.rooms[roomId] }));
                }
                if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId]) {
                    this.sockets[this.rooms[roomId].joiner.socketId].emit("joinerPit", JSON.stringify({ ...this.rooms[roomId] }));
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
                    this.sockets[this.rooms[roomId].creater.socketId].emit("createrPit", JSON.stringify({ ...this.rooms[roomId] }));
                }
                if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId]) {
                    this.sockets[this.rooms[roomId].joiner.socketId].emit("joinerPit", JSON.stringify({ ...this.rooms[roomId] }));
                }
                return;
            } else {
                // for visitors
                return;
            }
        }
        if (!this.rooms[roomId].creater) {
            if (this.rooms[roomId].joiner.address === address) {
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
                    }
                }
            }

            if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId) {
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.CONFIRM_CREATOR, JSON.stringify({ ...this.rooms[roomId] }));
            }
            if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId) {
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.CONFIRM_JOINER, JSON.stringify({ ...this.rooms[roomId] }));
            }
            return;
        }
        if (!this.rooms[roomId].joiner) {
            if (this.rooms[roomId].creater.address === address) {
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
                    }
                }
            }
            if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId]) {
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.CONFIRM_CREATOR, JSON.stringify({ ...this.rooms[roomId] }));
            }
            if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId]) {
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.CONFIRM_JOINER, JSON.stringify({ ...this.rooms[roomId] }));
            }
            return;
        }


    }
    pitReady(data, socketId) {
        const { roomId, address, nft } = data;
        this.sockets[socketId].emit('pitReadyAccepted', JSON.stringify({success: true}))
        if (this.rooms[roomId].creater && this.rooms[roomId].creater.address === address) {
            if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.status === true) {
                //first starter
                const starter = Math.floor(Math.random() * 10) % 2 === 0 ? this.starter = "creater" : 'joiner';
                //
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
                        hp: nft.hp
                    },
                    turn: starter,
                }
                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ starter, hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ starter, hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))
                // setTimeout(() => {
                //     this.sendShuffle(starter, this.rooms[roomId]);
                // }, 2000)

                return;
            } else {
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
                        hp: nft.hp || 0
                    }

                }
                if (this.rooms[roomId].joiner) {
                    this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_READY, JSON.stringify({ hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))
                }
                return;
            }

        }
        if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.address === address) {
            if (this.rooms[roomId].creater.status === true) {

                //first starter
                const starter = Math.floor(Math.random() * 10) % 2 === 0 ? this.starter = "creater" : 'joiner';
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
                        hp: nft.hp
                    },
                    turn: starter,
                }

                this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ starter, hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.ROOM_START, JSON.stringify({ starter, hp: this.rooms[roomId].creater.hp, nft: this.rooms[roomId].creater.nft }))
                // setTimeout(() => {
                //     this.sendShuffle(starter, this.rooms[roomId]);
                // }, 2000)
                return;
            } else {
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
                        hp: nft.hp || 0
                    },
                }
                if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId]) {
                    this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.ROOM_READY, JSON.stringify({ hp: this.rooms[roomId].joiner.hp, nft: this.rooms[roomId].joiner.nft }))
                }
            }

        }
    }

    selectAcitonCard(socketId, data){
        const {roomId, address, cardType, counterTime} = data;
        let shuffleCards = [3, 1, 0, 2];
        if(this.rooms[roomId].creater.address === address){
            console.log("==============here")
            this.sockets[this.rooms[roomId].joiner.socketId].emit(SOCKET_CONSTS.SELECT_AC, JSON.stringify({cardType, shuffleCards}));
        } else{
            console.log("here==============")
            this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.SELECT_AC, JSON.stringify({cardType, shuffleCards}));
        }
    }

    endTurn(data) { // game  logic (each turn)
        const { card, turnState, roomId, success } = data;

        const currentState = turnState === 'creater' ? 'joiner' : 'creater';

        if (turnState === 'creater') {
            if (success === true) {
                switch (card.label) {
                    case 'bite':
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 100;
                        this.rooms[roomId].joiner.nft.hp = this.rooms[roomId].joiner.nft.hp - 100;
                        break;
                    case 'grab':
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - (this.rooms[roomId].joiner.nft.bp / 2);
                        this.rooms[roomId].joiner.nft.hp = this.rooms[roomId].joiner.nft.hp - (this.rooms[roomId].joiner.nft.bp / 2);
                        currentState = turnState;
                        break;
                    case 'ability':

                        break;
                    case 'parry':

                        break;

                    default:
                        break;
                }
            }
        } else {
            if (success === true) {
                switch (card.label) {
                    case 'bite':
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 100;
                        this.rooms[roomId].creater.nft.hp = this.rooms[roomId].creater.nft.hp - 100;
                        break;
                    case 'grab':
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - (this.rooms[roomId].creater.nft.bp / 2);
                        this.rooms[roomId].creater.nft.hp = this.rooms[roomId].creater.nft.hp - (this.rooms[roomId].creater.nft.bp / 2);
                        currentState = turnState;
                        break;
                    case 'ability':

                        break;
                    case 'parry':

                        break;

                    default:
                        break;
                }
            }
        }

        if (this.rooms[roomId].joiner.hp === 0 || this.rooms[roomId].creater.hp === 0) {

        }
    }

    // sendShuffle(starter, roomstatus) {
    //     const { creater, joiner } = roomstatus;
    //     let shuffleArray = [];
    //     for (let i = 0; i < 6; i++) {
    //         shuffleArray.push([1, 2, 3, 4].sort(() => Math.random() - 0.5));
    //     }

    //     let shuffleContentArray = [1, 2, 3, 4];
    //     for (let i = shuffleContentArray.length - 1; i > 0; i--) {
    //         const j = Math.floor(Math.random() * (i + 1));
    //         [shuffleContentArray[i], shuffleContentArray[j]] = [shuffleContentArray[j], shuffleContentArray[i]];  // Swap elements
    //     }

    //     const questionNumber = Math.floor(Math.random() * 10) % 4;

    //     const data = {
    //         turn: starter,
    //         shuffleArray,
    //         shuffleContentArray,
    //         questionNumber,
    //         shuffleDuration: 0.3
    //     }
    //     if (this.sockets[creater.socketId]) {
    //         this.sockets[creater.socketId].emit("shuffleStart", JSON.stringify(data));
    //     }
    //     if (this.sockets[joiner.socketId]) {
    //         this.sockets[joiner.socketId].emit("shuffleStart", JSON.stringify(data));
    //     }
    // }

    // shuffle() {
    //     let shuffleCardsArray = [];
    //     for(let i = 0; i< 6; i++) {
    //         shuffleCardsArray.push();
    //     }
    // }

    turnCard(data) {
        const { card, turnState, roomId, success } = data;

        if (turnState === 'creater') {
            if (success === true) {
                switch (card.label) {
                    case "bite":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 100;
                        this.rooms[roomId].joiner.nft.hp = this.rooms[roomId].joiner.nft.hp - 100;
                        break;
                    case "ability":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 200;
                        this.rooms[roomId].joiner.nft.hp = this.rooms[roomId].joiner.nft.hp - 200;

                        break;
                    case "grab":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 300;
                        this.rooms[roomId].joiner.nft.hp = this.rooms[roomId].joiner.nft.hp - 300;

                        break;
                    case "parry":
                        this.rooms[roomId].joiner.hp = this.rooms[roomId].joiner.hp - 400;
                        this.rooms[roomId].joiner.nft.hp = this.rooms[roomId].joiner.nft.hp - 400;

                        break;

                    default:
                        break;
                }
            }
            this.sockets[this.rooms[roomId].creater.socketId].emit("winOrlose", JSON.stringify({
                hp: {
                    creater: this.rooms[roomId].creater.hp,
                    joiner: this.rooms[roomId].joiner.hp
                },
                nft: {
                    creater: this.rooms[roomId].creater.nft,
                    joiner: this.rooms[roomId].joiner.nft
                }
            }))
            this.sockets[this.rooms[roomId].joiner.socketId].emit("winOrlose", JSON.stringify({
                hp: {
                    creater: this.rooms[roomId].creater.hp,
                    joiner: this.rooms[roomId].joiner.hp
                },
                nft: {
                    creater: this.rooms[roomId].creater.nft,
                    joiner: this.rooms[roomId].joiner.nft
                }
            }))

            if (this.rooms[roomId].joiner && this.rooms[roomId].joiner.socketId && this.sockets[this.rooms[roomId].joiner.socketId]) {
                this.sockets[this.rooms[roomId].joiner.socketId].emit('turnCard', JSON.stringify({
                    card,
                    hp: {
                        creater: this.rooms[roomId].creater.hp,
                        joiner: this.rooms[roomId].joiner.hp
                    },
                    nft: {
                        creater: this.rooms[roomId].creater.nft,
                        joiner: this.rooms[roomId].joiner.nft
                    },
                    turnState: turnState === "creater" ? "joiner" : "creater"
                }))
            }
            // this.sendShuffle('joiner', this.rooms[roomId]);
            return;
        } else {
            if (success === true) {
                switch (card.label) {
                    case "bite":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 100;
                        this.rooms[roomId].creater.nft.hp = this.rooms[roomId].creater.nft.hp - 100;
                        break;
                    case "ability":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 200;
                        this.rooms[roomId].creater.nft.hp = this.rooms[roomId].creater.nft.hp - 200;
                        break;
                    case "grab":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 300;
                        this.rooms[roomId].creater.nft.hp = this.rooms[roomId].creater.nft.hp - 300;
                        break;
                    case "parry":
                        this.rooms[roomId].creater.hp = this.rooms[roomId].creater.hp - 400;
                        this.rooms[roomId].creater.nft.hp = this.rooms[roomId].creater.nft.hp - 400;
                        break;

                    default:
                        break;
                }
            }
            this.sockets[this.rooms[roomId].creater.socketId].emit("winOrlose", JSON.stringify({
                hp: {
                    creater: this.rooms[roomId].creater.hp,
                    joiner: this.rooms[roomId].joiner.hp
                },
                nft: {
                    creater: this.rooms[roomId].creater.nft,
                    joiner: this.rooms[roomId].joiner.nft
                }
            }))
            this.sockets[this.rooms[roomId].joiner.socketId].emit("winOrlose", JSON.stringify({
                hp: {
                    creater: this.rooms[roomId].creater.hp,
                    joiner: this.rooms[roomId].joiner.hp
                },
                nft: {
                    creater: this.rooms[roomId].creater.nft,
                    joiner: this.rooms[roomId].joiner.nft
                }
            }))

            if (this.rooms[roomId].creater && this.rooms[roomId].creater.socketId && this.sockets[this.rooms[roomId].creater.socketId]) {
                this.sockets[this.rooms[roomId].creater.socketId].emit('turnCard', JSON.stringify({
                    card,
                    hp: {
                        creater: this.rooms[roomId].creater.hp,
                        joiner: this.rooms[roomId].joiner.hp
                    },
                    nft: {
                        creater: this.rooms[roomId].creater.nft,
                        joiner: this.rooms[roomId].joiner.nft
                    },
                    turnState: turnState == "creator" ? "joiner" : "creator"
                }))
            }
            // this.sendShuffle('creater', this.rooms[roomId]);
        }


    }
    quitBattle(data) {
        // console.log(data);
    }
    quitBattle(socket, id, address, battleType) {
        if (this.battles[battleType])
            this.battles[battleType] = this.battles[battleType].filter(item => item.id !== id);
        if (this.battles[battleType]) {
            for (const itr of this.battles[battleType]) {
                this.sockets[itr.id].emit('quitBattle', JSON.stringify({ address }))
            }
        }
        // console.log(this.sockets[id])
        delete this.sockets[id];
    }
    quitRoom(data) {
        const { roomId, address } = data;
        if (this.rooms[roomId] && this.rooms[roomId].creater && this.rooms[roomId].creater.address === address) {
            // console.log("=====================================creater logout")
            this.sockets[this.rooms[roomId].creater.socketId].emit(SOCKET_CONSTS.QUIT_ROOM);

            if (this.rooms[roomId].joiner && this.sockets[this.rooms[roomId].joiner.socketId]) {
                this.sockets[this.rooms[roomId].joiner.socketId].emit('opponentPit', JSON.stringify({ msg: `${address}????? creater quit` }) )
            }
            this.rooms[roomId] = {
                ...this.rooms[roomId],
                creater: null,
                roomstatus: false
            }
        }

        if (this.rooms[roomId] && this.rooms[roomId].joiner && this.rooms[roomId].joiner.address === address) {
            // console.log("======================================joiner logout")
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
            delete this.rooms[roomId];
            // console.log(roomId);
            const battleType = roomId.split('_')[0];
            for (let item of this.battles[battleType]) {
                if (item && item.id) {
                    // console.log(item.id);
                    this.sockets[item.id].emit(SOCKET_CONSTS.REMOVE_ROOM, JSON.stringify({ msg: 'room deleted', roomId: roomId }))
                }
            }
        } else {

        }

    }
    disconnect(id, battleType) {
        // this.rooms[roomId]
        delete this.sockets[id];
        if (battleType && this.battles[battleType] && this.battles[battleType].length > 0) {
            this.battles[battleType] = this.battles[battleType].filter(item => item.id !== id);
        }
        // this.products = { ...this.products, ['product_' + productId]: this.products['product_' + productId].filter(_id => _id !== id) };
    }
}

module.exports = SocketManager;