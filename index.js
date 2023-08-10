const app = require('./app');
const config = require('./config');
const socketio = require("socket.io");
const SocketEngine = require('./services/socket/socket');

const PORT = process.env.PORT || config.port;

const server = app.listen(PORT, () => {
  console.log('server is running on port', server.address().port);
});

const io = socketio(server,{
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const socket = new SocketEngine(io);