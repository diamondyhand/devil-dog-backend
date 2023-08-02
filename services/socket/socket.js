// const socketIO = require('socket.io');
const SocketManager = require('./socketManager');

const socketManager = new SocketManager;
const SOCKET_CONSTS = require('./sockProc');

class SocketEngine {
    constructor(io) {
        this.io = io;
        this.sockets - {};
        this.users = {};
        this.init();
    }
    async init() {
        // console.log('#init');
        // console.log('Server socket created');
        this.io.on('connection', function (socket) {
            // console.log('a client created');
            // console.log(socket.id);
            // socket.emit('transaction', 'adfasdfasdfas');
            socket.on(SOCKET_CONSTS.JOIN_BATTLE, (data) => {
                // console.log('battle')
                const _data = JSON.parse(data);
                // console.log("battle sub page entered.", { _data });
                socketManager.enterRoom(socket, socket.id, _data.address, _data.battleType);
                socket.battleType = _data.battleType;
                // console.log(socket.battleType);
            })
            socket.on('quitBattle', (data) => {
                // console.log('quit battle')
                const _data = JSON.parse(data);
                // console.log("battle sub page entered.", { _data });
                socketManager.quitRoom(socket, socket.id, _data.address, _data.battleType);
            })
            socket.on('confirmPit', (data)=>{
                const _data= JSON.parse(data);
                socketManager.confirmPit(_data, socket.id);
            })
            socket.on('pitReady', (data)=>{
                const _data= JSON.parse(data);
                socketManager.pitReady(_data);
                socket.emit('pitReadyAccepted', JSON.stringify({success: true}))
            })
            socket.on(SOCKET_CONSTS.QUIT_ROOM, (data)=>{
                const _data= JSON.parse(data);
                socketManager.quitPit(_data);
                // socket.emit('pitReadyAccepted', JSON.stringify({success: true}))
            })
            socket.on('turnCard', (data)=>{
                const _data = JSON.parse(data);
                socketManager.turnCard(_data);
            })
            socket.on('disconnect', () => {
                // console.log('A client disconnected.', socket.id);
                // console.log('a client disconnected', socket.id);
                socketManager.disconnect(socket.id, socket.battleType);

            })
        })

    }


}
module.exports = SocketEngine;
