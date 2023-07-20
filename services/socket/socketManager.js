const { add } = require("winston");

class SocketManager {
    constructor() {
        this.sockets = {}; // address: socket
        this.battles = {}; // productId : [address]
        this.pits = {};
    }
    enterRoom(socket, id, address, battleType) {
        // this.products.address = productId;
        if (!address) return;
        this.sockets[id] = socket;
        if (this.battles[battleType]) {
            for (const itr of this.battles[battleType]) {
                this.sockets[itr.id].emit('newJoiner', JSON.stringify({ address }))
            }
        }

        this.battles[battleType] = this.battles[battleType] ? [...this.battles[battleType], { id, address }] : [{ id, address }];
        let pits = [];
        for (let pit in this.pits) {
            if (pit.startsWith(battleType)) {
                const _pit = this.pits[pit];
                // console.log(_pit.creater?.nft);
                pits.push({
                    id: pit,
                    address1: _pit.creater ? _pit.creater.address : 'empty',
                    address2: _pit.joiner ? _pit.joiner.address : 'empty',
                    nftUrl1: (_pit.creater && _pit.creater.nft) ? _pit.creater.nft.nft.img : '',
                    nftUrl2: (_pit.joiner && _pit.joiner.nft) ? _pit.joiner.nft.nft.img : '',
                    status: _pit.pitStatus,
                    visitorNumber: 0
                });
            }
        }
        console.log(pits);
        socket.emit("joiners", JSON.stringify({ joiners: this.battles[battleType], _pits: pits }));
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
    createPit(data, socketId) {
        const { roomId, address } = data;
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
        this.sockets[socketId].emit('pitCreated', JSON.stringify({ ...this.pits[roomId] }));

    }
    confirmPit(data, socketId) {
        const { roomId } = data;
        if (this.pits[roomId]) {
            this.joinPit(data, socketId);
        } else {
            this.createPit(data, socketId);
        }
        const battleType = roomId.split('_')[0];
        const _pit = this.pits[roomId];
        for (let item of this.battles[battleType]) {
            if (item && item.id) {
                console.log(item.id);
                this.sockets[item.id].emit('newPit', JSON.stringify({
                    newPit: {
                        id: roomId,
                        address1: _pit.creater ? _pit.creater.address : 'empty',
                        address2: _pit.joiner ? _pit.joiner.address : 'empty',
                        nftUrl1: (_pit.creater && _pit.creater.nft) ? _pit.creater.nft.nft.img : '',
                        nftUrl2: (_pit.joiner && _pit.joiner.nft) ? _pit.joiner.nft.nft.img : '',
                        status: _pit.pitStatus,
                        visitorNumber: 0
                    }
                }))
            }
        }
    }
    joinPit(data, socketId) {
        const { roomId, address } = data;
        console.log({ socketId });
        console.log(this.pits);
        console.log('creterSocketId,', this.pits[roomId].creater.socketId);
        if (this.pits[roomId].creater && this.pits[roomId].joiner) {
            if (this.pits[roomId].creater.address === address) {
                const creater = this.pits[roomId].creater;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    creater: {
                        ...creater,
                        socketId
                    }

                };
                if (this.pits[roomId].creater && this.pits[roomId].creater.socketId) {
                    this.sockets[this.pits[roomId].creater.socketId].emit("createrPit", JSON.stringify({ ...this.pits[roomId] }));
                }
                if (this.pits[roomId].joiner && this.pits[roomId].joiner.socketId && this.sockets[this.pits[roomId].joiner.socketId]) {
                    this.sockets[this.pits[roomId].joiner.socketId].emit("joinerPit", JSON.stringify({ ...this.pits[roomId] }));
                }
                return;
            } else if (this.pits[roomId].joiner.address === address) {
                const joiner = this.pits[roomId].joiner;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    joiner: {
                        ...joiner,
                        socketId
                    }
                };
                if (this.pits[roomId].creater && this.pits[roomId].creater.socketId && this.sockets[this.pits[roomId].creater.socketId]) {
                    this.sockets[this.pits[roomId].creater.socketId].emit("createrPit", JSON.stringify({ ...this.pits[roomId] }));
                }
                if (this.pits[roomId].joiner && this.pits[roomId].joiner.socketId && this.sockets[this.pits[roomId].joiner.socketId]) {
                    this.sockets[this.pits[roomId].joiner.socketId].emit("joinerPit", JSON.stringify({ ...this.pits[roomId] }));
                }
                return;
            } else {
                // for visitors
                return;
            }
        }
        if (!this.pits[roomId].creater) {
            if (this.pits[roomId].joiner.address === address) {
                const joiner = this.pits[roomId].joiner;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    joiner: {
                        ...joiner,
                        socketId
                    }
                }
            } else {
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    creater: {
                        address,
                        socketId,
                        hp: 0,
                        nft: null,
                        status: false,
                    }
                }
            }

            if (this.pits[roomId].creater && this.pits[roomId].creater.socketId) {
                this.sockets[this.pits[roomId].creater.socketId].emit("createrPit", JSON.stringify({ ...this.pits[roomId] }));
            }
            if (this.pits[roomId].joiner && this.pits[roomId].joiner.socketId) {
                this.sockets[this.pits[roomId].joiner.socketId].emit("joinerPit", JSON.stringify({ ...this.pits[roomId] }));
            }
            return;
        }
        if (!this.pits[roomId].joiner) {
            if (this.pits[roomId].creater.address === address) {
                const creater = this.pits[roomId].creater;
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    creater: {
                        ...creater,
                        socketId
                    }
                }
            } else {
                this.pits[roomId] = {
                    ...this.pits[roomId],
                    joiner: {
                        address,
                        socketId,
                        hp: 0,
                        nft: null,
                        status: false,
                    }
                }
                // console.log('joiner', this.pits[roomId])
            }
            if (this.pits[roomId].creater && this.pits[roomId].creater.socketId && this.sockets[this.pits[roomId].creater.socketId]) {
                this.sockets[this.pits[roomId].creater.socketId].emit("createrPit", JSON.stringify({ ...this.pits[roomId] }));
            }
            if (this.pits[roomId].joiner && this.pits[roomId].joiner.socketId && this.sockets[this.pits[roomId].joiner.socketId]) {
                this.sockets[this.pits[roomId].joiner.socketId].emit("joinerPit", JSON.stringify({ ...this.pits[roomId] }));
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