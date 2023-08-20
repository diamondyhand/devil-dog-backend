// const socketIO = require('socket.io');
const { json } = require('body-parser');
const SocketManager = require('./socketManager');

const socketManager = new SocketManager;
const SOCKET_CONSTS = require('./sockProc');

class SocketEngine {
    constructor(io) {
        this.io = io;
        this.sockets = {};
        this.users = {};
        this.init();
    }
    async init() {
        this.io.on('connection', function (socket) {
            socket.on(SOCKET_CONSTS.ENTER_BATTLE, (data)=>{
                const _data = JSON.parse(data)
                socket.battleType = _data.battleType;
                console.log("enter battle")
                console.log("id => ", socket.id)
                socketManager.enterBattle(socket, socket.id, _data.address, _data.battleType);
            })

            socket.on(SOCKET_CONSTS.ENTER_ROOM, (data)=>{
                const _data = JSON.parse(data)
                
                socket.battleType = _data.battleType;
                console.log("enter room")
                console.log("id => ", socket.id)
                socketManager.enterRoom(socket, socket.id, _data.address, _data.battleType);
            })

            socket.on(SOCKET_CONSTS.CONFIRM_ROOM, (data)=>{
                const _data= JSON.parse(data);
                console.log("confirm room")
                console.log("id => ", socket.id)
                socketManager.confirmRoom(_data, socket.id);
            })

            socket.on(SOCKET_CONSTS.QUIT_ROOM, (data)=>{
                const _data= JSON.parse(data);
                console.log("quit room")
                console.log("id => ", socket.id)
                socketManager.quitRoom(_data);
                // socket.emit('pitReadyAccepted', JSON.stringify({success: true}))
            })
            
            socket.on(SOCKET_CONSTS.ROOM_READY, (data)=>{
                const _data= JSON.parse(data);
                console.log("room ready")
                console.log("id => ", socket.id)
                console.log("data => ", data)
                socketManager.pitReady(_data, socket.id);
                // console.log(socket.id)
                // socket.emit('pitReadyAccepted', JSON.stringify({success: true}))
            })

            socket.on('quitBattle', (data) => {
                const _data = JSON.parse(data);
                // console.log("battle sub page entered.", { _data });
                console.log("quitBattle")
                console.log("id => ", socket.id)
                socketManager.quitBattle(socket, socket.id, _data.address, _data.battleType);
            })

            socket.on(SOCKET_CONSTS.SELECT_AC, (data) => {
                const _data = JSON.parse(data);
                socketManager.selectAcitonCard(_data);

            })

            socket.on(SOCKET_CONSTS.COMPARE_CARD, (data) => {
                const _data = JSON.parse(data);
                socketManager.compareCard(_data);
            })
            
            socket.on('disconnect', () => {
                console.log("disconnect")
                console.log("id => ", socket.id)
                // console.log('A client disconnected.', socket.id);
                // console.log('a client disconnected', socket.id);
                socketManager.disconnect(socket.id, socket.battleType);
            })
        })
        this.io.emit("hello")  

    }


}
module.exports = SocketEngine;
