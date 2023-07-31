const app = require('./app');
const config = require('./config');
const socketio = require("socket.io");
const mongoose = require("mongoose");
const SocketEngine = require('./services/socket/socket');

const PORT = process.env.PORT || config.port;

const server = app.listen(PORT, () => {
  console.log('server is running on port', server.address().port);
});

mongoose
.connect(config.mongodb)
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('mongoDB is err, ', err));

const io = socketio(server,{
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const socket = new SocketEngine(io);