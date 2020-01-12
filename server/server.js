const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// TODO: host rooms on database to not lose data on startup
const rooms = {
  '1': {
    showId: '70116062',
    theme: 'robohash',
    hostId: '1',
    isPlaying: true,
    typing: {}, // Stores usernames of those currently typing
    members: {}
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
  socket.on('create', function({ showId, theme }, res) {
    const id = generateRoomId();
    rooms[id] = {
      theme,
      showId,
      hostId: socket.id,
      typing: {},         // Stores usernames of those currently typing
      members: {}         // Maps usernames to socket ids
    };
    res(id);
  });

  socket.on('roomCheck', function({ roomId }, res) {
    const room = rooms[roomId];
    if (room == null) res(null);
    else res(room.showId);
  });

  socket.on('join', function({ username, roomId, isHost }) {
    const room = rooms[roomId];
    if (room == null) {
      console.log(`Invalid room ${roomId} request by ${username}.`);
      return;
    }
    if (isHost) room.hostId = socket.id;  // set host id if host joined
    else socket.to(room.hostId).emit('queryPlayback', { responseSocketId: socket.id });
    room.members[username] = socket.id;

    user.name = username;
    // If there is an existing socket
    if (user.roomId.length) socket.leave(user.roomId);
    user.roomId = roomId;
    socket.join(roomId);
    sendStatus(socket, roomId, `${username} joined the room!`);
    sendStatusSelf(socket, 'You joined the room!');
  });

  // Listen for playback response from host
  socket.on('queryPlaybackResponse', function({ responseSocketId, factor, roomId }) {
    const isPlaying = rooms[roomId].isPlaying;
    socket.to(responseSocketId).emit('setPlayback', { factor, isPlaying });
  });

  socket.on('chatMessage', function(data){
    const { username, roomId, msg } = data;
    if (roomId == null) return;
    if (!rooms[roomId]) return;
    // TODO: When host refreshes page, dont let host reenter
    const gravatar = getGravatarURL(username, rooms[roomId].theme);
    socket.to(roomId).emit('chatMessage', { username, gravatar, msg });
    socket.emit('userMessage', { gravatar, msg });
  });
  // On close tab or leave room.
  // Client socket has been disconnected from the room.
  socket.on('disconnect', function() {
    const room = rooms[user.roomId];
    if (room == null) return;

    delete rooms[user.roomId].typing[user.name];
    delete rooms[user.roomId].members[user.name];
    updateTypingStatus(socket, user.roomId);

    const members = Object.keys(room.members);
    // delete room if no more members left in the room
    if (members.length === 0) {
      // Not test room
      if (user.roomId !== '1') delete rooms[user.roomId];
      return
    }

    sendStatus(socket, user.roomId, `${user.name} left the room.`);

    // Host left.  Change host.
    if (socket.id === room.hostId) {
      const nextHost = members[0];
      room.hostId = room.members[nextHost];
      sendStatus(socket, room.hostId, 'You are now the host of this room.');
      sendStatus(socket, user.roomId, `${nextHost} is now the host of this room.`);
    }
  });
  socket.on('play', function({ username, roomId }) {
    if (rooms[roomId] == null) return;
    socket.to(roomId).emit('command', { command: 'play' });
    sendStatus(socket, roomId, `Video played by ${username}.`);
    sendStatusSelf(socket, 'You played the video.');
    rooms[roomId].isPlaying = true;
  });
  socket.on('pause', function({ username, roomId, time }) {
    if (rooms[roomId] == null) return;
    socket.to(roomId).emit('command', { command: 'pause' });
    sendStatus(socket, roomId, `Video paused by ${username} at ${time}.`);
    sendStatusSelf(socket, `You paused the video at ${time}.`);
    rooms[roomId].isPlaying = false;
  });
  socket.on('seek', function({ username, roomId, time, factor }) {
    socket.to(roomId).emit('command', { command: 'seek', factor });
    sendStatus(socket, roomId, `${username} jumped to ${time}.`);
    sendStatusSelf(socket, `You jumped to ${time}.`);
  });
  // TODO: Don't count current user
  socket.on('typingStatus', function({ isTyping, roomId, username }) {
    const room = rooms[roomId];
    if (room == null) return;

    if (isTyping) room.typing[username] = true;
    else delete room.typing[username];

    updateTypingStatus(socket, roomId);
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
  console.log(room, status)
  socket.to(room).emit('status', { status });
}

// Send status to self
function sendStatusSelf(socket, status) {
  console.log('self', status)
  socket.emit('statusSelf', { status });
}

// Update typing status.  Called after modifying typing map.
function updateTypingStatus(socket, roomId) {
  const typingUsers = rooms[roomId].typing;
  let message = '';
  const currTypingCount = Object.keys(typingUsers).length;
  switch (currTypingCount) {
    case 0:
      break;
    case 1:
      const username = Object.keys(typingUsers)[0];
      message = `${username} is typing...`;
      break;
    default:
      message = 'Several people are typing...';
  }

  socket.to(roomId).emit('typingStatus', { message });
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
  return `https://www.gravatar.com/avatar/${hashString(username)}?d=${icon}`;
}
