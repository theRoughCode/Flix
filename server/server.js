const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

const rooms = {
  '1': {
    showId: '70276688',
    theme: 'robohash',
    hostId: '1'
  }
};

app.get('/', function(req, res){
  res.send(`Listening on port ${PORT}`);
});

io.on('connection', function(socket){
  const user = {
    name: "",
    roomId: ""
  };

  // Add room to room list
  socket.on('create', function({ showId, theme }) {
    const id = generateRoomId();
    rooms[id] = { theme, showId, hostId: socket.id };
    socket.emit('createResponse', { id });
  });

  socket.on('join', function({ username, roomId, isHost }) {
    const room = rooms[roomId];
    if (room == null) {
      console.log(`Invalid room ${roomId} request by ${username}.`);
      return;
    }
    if (isHost) rooms[roomId].hostId = socket.id;  // set host id if host joined
    user.name = username;

    if (room == null) {
      socket.emit('joinResponse', {});
    } else {
      socket.emit('joinResponse', { showId: room.showId });
      // If there is an existing socket
      // TODO: Disable user from sending chat messages to that chat
      if (user.roomId.length) socket.leave(user.roomId);
      user.roomId = roomId;
      socket.join(roomId);
      sendStatus(socket, roomId, `${username} joined the room!`);
      sendStatusSelf(socket, 'You joined the room!');
    }
  });

  socket.on('chatMessage', function(data){
    const { username, roomId, msg } = data;
    if (roomId == null) return;
    const gravatar = getGravatarURL(username, rooms[roomId].theme);
    socket.to(roomId).emit('chatMessage', { username, gravatar, msg });
    socket.emit('userMessage', { gravatar, msg });
  });
  socket.on('leave', function({ username, roomId }) {
    socket.leave(roomId);
    // Host left
    if (socket.id === rooms[roomId].hostId) {
      sendStatus(socket, roomId, `${username} (the host) left the room.  This room will be closed.`);
      sendStatusSelf(socket, 'You (the host) left the room. This room will be closed.');
      socket.to(roomId).emit('command', { command: 'closeRoom' });
      delete rooms[roomId];
    } else {
      sendStatus(socket, roomId, `${username} left the room.`);
      sendStatusSelf(socket, 'You left the room.');
    }
  });
  socket.on('play', function({ username, roomId }) {
    socket.to(roomId).emit('command', { command: 'play' });
    sendStatus(socket, roomId, `Video played by ${username}.`);
    sendStatusSelf(socket, 'You played the video.');
  });
  socket.on('pause', function({ username, roomId, time }) {
    socket.to(roomId).emit('command', { command: 'pause' });
    sendStatus(socket, roomId, `Video paused by ${username} at ${time}.`);
    sendStatusSelf(socket, `You paused the video at ${time}.`);
  });
  socket.on('seek', function({ username, roomId, time, factor }) {
    socket.to(roomId).emit('command', { command: 'seek', factor });
    sendStatus(socket, roomId, `${username} jumped to ${time}.`);
    sendStatusSelf(socket, `You jumped to ${time}.`);
  });
  socket.on('log', function({ msg }) {
    console.log(msg);
  });
});

http.listen(PORT, function(){
  console.log(`Listening on port ${PORT}`);
});

// Broadcast status to room
function sendStatus(socket, room, status) {
  socket.to(room).emit('status', { status });
}

// Send status to self
function sendStatusSelf(socket, status) {
  socket.emit('statusSelf', { status });
}

// Generate room id
function generateRoomId() {
  while (true) {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    if (!rooms.hasOwnProperty(id)) return id;
  }
}

// Hash username
function hashString(str) {
  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

// Generate gravtar url
function getGravatarURL(username, icon) {
  return `http://www.gravatar.com/avatar/${hashString(username)}?d=${icon}`;
}
