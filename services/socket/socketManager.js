const { add } = require("winston");
const { Room } = require("../../models");

class SocketManager {
    constructor() {
        this.sockets = {}; // address: socket
        this.battles = {}; // productId : [address]
        this.pits = {};
    }
    async enterRoom(socket, id, address, battleType) {
        // this.products.address = productId;
        console.log('id', battleType)
        if (!address) return;
        this.sockets[id] = socket;
        if (this.battles[battleType]) {
            for (const itr of this.battles[battleType]) {
                this.sockets[itr.id].emit('newJoiner', JSON.stringify({ address }))
            }
        }

        this.battles[battleType] = this.battles[battleType] ? [...this.battles[battleType], { id, address }] : [{ id, address }];
        // let pits = [];
        // for (let pit in this.pits) {
        //     if (pit.startsWith(battleType)) {
        //         const _pit = this.pits[pit];
        //         // console.log(_pit.creater?.nft);
        //         pits.push({
        //             id: pit,
        //             address1: _pit.creater ? _pit.creater.address : 'empty',
        //             address2: _pit.joiner ? _pit.joiner.address : 'empty',
        //             nftUrl1: (_pit.creater && _pit.creater.nft) ? _pit.creater.nft.nft.img : '',
        //             nftUrl2: (_pit.joiner && _pit.joiner.nft) ? _pit.joiner.nft.nft.img : '',
        //             status: _pit.pitStatus,
        //             visitorNumber: 0
        //         });
        //     }
        // }
        const pits = await Room.find({
            battleType,
            pitStatus: false
        });
        socket.emit("joiners", JSON.stringify({ joiners: this.battles[battleType], _pits: pits.map(pit => ({
                id: pit.roomId,
                address1: pit?.creater?.address,
                address2: pit?.joiner?.address,
                nftUrl1: pit?.creater?.nft?.img,
                nftUrl2: pit?.joiner?.nft?.img,
                status: pit.pitStatus,
                visitorNumber: 0
            })) 
        }));
    }
    quitRoom(socket, id, address, battleType) {
        if (this.battles[battleType])
            this.battles[battleType] = this.battles[battleType].filter(item => item.id !== id);
        if (this.battles[battleType]) {
            for (const itr of this.battles[battleType]) {
                this.sockets[itr.id].emit('quitBattle', JSON.stringify({ address }))
            }
        }
        console.log(this.battles);
        delete this.sockets[id];
    }
    async createPit(data, socketId) {
        const { roomId, address, battleType } = data;
        const room = await Room.findOne({
            roomId
        });

        if (!room) {
            this.sockets[socketId].emit('pitCreated', JSON.stringify({ 
                creater: {
                    address,
                    socketId,
                    nft: null,
                    hp: 0,
                    status: false,
                },
                joiner: null,
                pitStatus: false,
            }));

            const roomSchema = new Room({
                creater: {
                    address,
                    socketId,
                    status: false
                },
                pitStatus: false,
                roomId,
                battleType
            });
    
            return await roomSchema.save();
        }

        this.pits[roomId] = {
            creater: {
                address,
                socketId,
                nft: null,
                hp: 0,
                status: false,
            },
            joiner: null,
            pitStatus: false,
        }
    }
    async confirmPit(data, socketId) {
        const { roomId } = data;
        let room = await Room.findOne({
            roomId
        });
        if (room) {
            this.joinPit(data, socketId);
        } else {
            room = await this.createPit(data, socketId);
        }
        const battleType = roomId.split('_')[0];
        for (let item of this.battles[battleType]) {
            if (item && item.id) {
                console.log(item.id);
                this.sockets[item.id].emit('newPit', JSON.stringify({
                    newPit: {
                        id: roomId,
                        address1: room?.creater?.address,
                        address2: room?.joiner?.address,
                        nftUrl1: room?.creater?.nft?.img,
                        nftUrl2: room?.joiner?.nft?.img,
                        status: room.pitStatus,
                        visitorNumber: 0
                    }
                }))
            }
        }
    }
    async joinPit(data, socketId) {
        const { roomId, address } = data;
        console.log({ socketId });
        console.log(this.pits);
        const room = await Room.findOne({
            roomId
        });
        if (room.creater && room.joiner) {
            if (this.pits[roomId].creater.address === address) {
                await Room.findOneAndUpdate({ roomId }, {
                    creater: {
                        ...room.creater,
                        socketId
                    }
                });
                if (room.creater && room.creater.socketId) {
                    this.sockets[room.creater.socketId].emit("createrPit", JSON.stringify(room));
                }
                if (room.joiner && room.joiner.socketId && this.sockets[room.joiner.socketId]) {
                    this.sockets[room.joiner.socketId].emit("joinerPit", JSON.stringify(room));
                }
                return;
            } else if (room.joiner.address === address) {
                await Room.findOneAndUpdate({ roomId }, {
                    joiner: {
                        ...room.joiner,
                        socketId
                    }
                });
                if (room.creater && room.creater.socketId && this.sockets[room.creater.socketId]) {
                    this.sockets[room.creater.socketId].emit("createrPit", JSON.stringify(room));
                }
                if (room.joiner && room.joiner.socketId && this.sockets[room.joiner.socketId]) {
                    this.sockets[room.joiner.socketId].emit("joinerPit", JSON.stringify(room));
                }
                return;
            } else {
                // for visitors
                return;
            }
        }
        if (!room.creater) {
            if (room.joiner.address === address) {
                await Room.findOneAndUpdate({ roomId }, {
                    joiner: {
                        ...room.joiner,
                        socketId
                    }
                });
            } else {
                await Room.findOneAndUpdate({ roomId }, {
                    creater: {
                        address,
                        socketId,
                        hp: 0,
                        nft: null,
                        status: false,
                    }
                });
            }

            if (room.creater && room.creater.socketId) {
                this.sockets[room.creater.socketId].emit("createrPit", JSON.stringify(room));
            }
            if (room.joiner && room.joiner.socketId) {
                this.sockets[room.joiner.socketId].emit("joinerPit", JSON.stringify(room));
            }
            return;
        }
        if (!room.joiner) {
            if (room.creater.address === address) {
                await Room.findOneAndUpdate({ roomId }, {
                    creater: {
                        ...room.creater,
                        socketId
                    }
                });
            } else {
                await Room.findOneAndUpdate({ roomId }, {
                    joiner: {
                        address,
                        socketId,
                        hp: 0,
                        nft: null,
                        status: false,
                    }
                });
                // console.log('joiner', this.pits[roomId])
            }
            if (room.creater && this.pits[roomId].creater.socketId && this.sockets[room.creater.socketId]) {
                this.sockets[room.creater.socketId].emit("createrPit", JSON.stringify(room));
            }
            if (room.joiner && room.joiner.socketId && this.sockets[room.joiner.socketId]) {
                this.sockets[room.joiner.socketId].emit("joinerPit", JSON.stringify(room));
            }
            return;
        }


    }
    pitReady(data) {
        const { roomId, address, nft } = data;
        console.log("pitReady", data);
        if (this.pits[roomId].creater && this.pits[roomId].creater.address === address) {
            if (this.pits[roomId].joiner && this.pits[roomId].joiner.status === true) {
                //first starter
                const starter = Math.floor(Math.random() * 10) % 2 === 0 ? this.starter = "creater" : 'joiner';
                //
                const creater = this.pits[roomId].creater;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    pitStatus: true,
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
                this.sockets[this.pits[roomId].creater.socketId].emit('pitStart', JSON.stringify({ starter, hp: this.pits[roomId].joiner.hp, nft: this.pits[roomId].joiner.nft }))
                this.sockets[this.pits[roomId].joiner.socketId].emit('pitStart', JSON.stringify({ starter, hp: this.pits[roomId].creater.hp, nft: this.pits[roomId].creater.nft }))
                console.log(this.pits[roomId]);
                setTimeout(() => {
                    this.sendShuffle(starter, this.pits[roomId]);
                }, 2000)

                return;
            } else {
                const creater = this.pits[roomId].creater;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    pitStatus: false,
                    creater: {
                        ...creater,
                        status: true,
                        nft: {
                            ...nft
                        },
                        hp: nft.hp || 0
                    }

                }
                if (this.pits[roomId].joiner) {
                    this.sockets[this.pits[roomId].joiner.socketId].emit('pitReady', JSON.stringify({ hp: this.pits[roomId].creater.hp, nft: this.pits[roomId].creater.nft }))
                }
                return;
            }

        }
        if (this.pits[roomId].joiner && this.pits[roomId].joiner.address === address) {
            if (this.pits[roomId].creater.status === true) {

                //first starter
                const starter = Math.floor(Math.random() * 10) % 2 === 0 ? this.starter = "creater" : 'joiner';
                //
                const joiner = this.pits[roomId].joiner;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    joiner: {
                        ...joiner,
                        status: true,
                        pitStatus: true,
                        nft: {
                            ...nft
                        },
                        hp: nft.hp
                    },
                    turn: starter,
                }

                this.sockets[this.pits[roomId].creater.socketId].emit('pitStart', JSON.stringify({ starter, hp: this.pits[roomId].joiner.hp, nft: this.pits[roomId].joiner.nft }))
                this.sockets[this.pits[roomId].joiner.socketId].emit('pitStart', JSON.stringify({ starter, hp: this.pits[roomId].creater.hp, nft: this.pits[roomId].creater.nft }))
                setTimeout(() => {
                    this.sendShuffle(starter, this.pits[roomId]);
                }, 2000)
                return;
            } else {
                const joiner = this.pits[roomId].joiner;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    joiner: {
                        ...joiner,
                        status: true,
                        pitStatus: false,
                        nft: {
                            ...nft
                        },
                        hp: nft.hp || 0
                    },
                }
                if (this.pits[roomId].creater && this.pits[roomId].creater.socketId && this.sockets[this.pits[roomId].creater.socketId]) {
                    this.sockets[this.pits[roomId].creater.socketId].emit('pitReady', JSON.stringify({ hp: this.pits[roomId].joiner.hp, nft: this.pits[roomId].joiner.nft }))
                }
            }

        }
    }
    sendShuffle(starter, pitStatus) {
        const { creater, joiner } = pitStatus;
        console.log({ creater, joiner })
        let shuffleArray = [];
        for (let i = 0; i < 6; i++) {
            shuffleArray.push([1, 2, 3, 4].sort(() => Math.random() - 0.5));
        }

        let shuffleContentArray = [1, 2, 3, 4];
        for (let i = shuffleContentArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffleContentArray[i], shuffleContentArray[j]] = [shuffleContentArray[j], shuffleContentArray[i]];  // Swap elements
        }

        const questionNumber = Math.floor(Math.random() * 10) % 4;

        const data = {
            turn: starter,
            shuffleArray,
            shuffleContentArray,
            questionNumber,
            shuffleDuration: 0.3
        }
        if (this.sockets[creater.socketId]) {
            console.log('shuffleStart')
            // console.log(this.sockets[creater.socketId]);
            this.sockets[creater.socketId].emit("shuffleStart", JSON.stringify(data));
        }
        if (this.sockets[joiner.socketId]) {
            console.log('shuffleStart')
            this.sockets[joiner.socketId].emit("shuffleStart", JSON.stringify(data));
        }
    }
    turnCard(data) {
        const { card, turnState, roomId, success } = data;
        console.log('turnCard', data);
        if (turnState === 'creater') {
            if (this.pits[roomId].joiner && this.pits[roomId].joiner.socketId && this.sockets[this.pits[roomId].joiner.socketId]) {
                this.sockets[this.pits[roomId].joiner.socketId].emit('turnCard', JSON.stringify({
                    card,
                    success,
                }))
            }
            return;
        } else {
            if (this.pits[roomId].creater && this.pits[roomId].creater.socketId && this.sockets[this.pits[roomId].creater.socketId]) {
                this.sockets[this.pits[roomId].creater.socketId].emit('turnCard', JSON.stringify({
                    card
                }))
            }
        }

        const currentState = turnState === 'creater' ? 'joiner' : 'creater';
    }
    quitPit(data) {
        const { roomId, address } = data;
        console.log("quitPit", data);
        if (this.pits[roomId] && this.pits[roomId].creater && this.pits[roomId].creater.address === address) {

            this.sockets[this.pits[roomId].creater.socketId].emit('quitPit', JSON.stringify({ msg: `${address} quitted this pit` }))
            if(this.pits[roomId].joiner && this.sockets[this.pits[roomId].joiner.socketId]){
                this.sockets[this.pits[roomId].joiner.socketId].emit('opponentPit', JSON.stringify({ msg: `${address} quitted this pit` }))
            }
            this.pits[roomId] = {
                ...this.pits[roomId],
                creater: null,
                pitStatus: false
            }
            
        }
        if (this.pits[roomId] && this.pits[roomId].joiner && this.pits[roomId].joiner.address === address) {

            this.sockets[this.pits[roomId].joiner.socketId].emit('opponentPit', JSON.stringify({ msg: `${address} quitted this pit` }))
            if(this.pits[roomId].creater && this.sockets[this.pits[roomId].creater.socketId]){
                this.sockets[this.pits[roomId].creater.socketId].emit('quitPit', JSON.stringify({ msg: `${address} quitted this pit` }))
            }
            this.pits[roomId] = {
                ...this.pits[roomId],
                joiner: null,
                pitStatus: false
            }
            return;
        }
        if (!this.pits[roomId]) {

        } else if (this.pits[roomId].joiner === null && this.pits[roomId].creater === null) {
            delete this.pits[roomId];
            console.log(roomId);
            const battleType = roomId.split('_')[0];
            for (let item of this.battles[battleType]) {
                if (item && item.id) {
                    console.log(item.id);
                    this.sockets[item.id].emit('deletePit', JSON.stringify({ msg: 'pit deleted', roomId: roomId }))
                }
            }
        } else {

        }

    }
    disconnect(id, battleType) {
        delete this.sockets[id];
        if (battleType && this.battles[battleType] && this.battles[battleType].length > 0) {
            this.battles[battleType] = this.battles[battleType].filter(item => item.id !== id);
        }
        // this.products = { ...this.products, ['product_' + productId]: this.products['product_' + productId].filter(_id => _id !== id) };
    }
}

module.exports = SocketManager;