const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.send('I love bacon');
});

io.on('connection', function(socket){
  let username, gravatar;

  socket.on('join', function({ name, gravatarURL }) {
    username = name;
    gravatar = gravatarURL;
    sendStatus(`${name} joined the room!`);
  });

  // data = { username, gravatar, msg }
  socket.on('chat message', function(data){
    io.emit('chat message', data);
  });
  socket.on('disconnect', function(){
    console.log(`${username} disconnected.`);
  });
  socket.on('play', function() {
    io.emit('command', { command: 'play' });
    sendStatus(`Video played by ${username}.`);
  });
  socket.on('pause', function({ time }) {
    io.emit('command', { command: 'pause' });
    sendStatus(`Video paused by ${username} at ${time}.`);
  });
  socket.on('seek', function({ time, factor }) {
    io.emit('command', { command: 'seek', factor });
    sendStatus(`Video seeked to ${time}.`);
  });
});

http.listen(PORT, function(){
  console.log(`Listening on port ${PORT}`);
});

// msg = { status }
function sendStatus(status) {
  io.emit('status', { status });
}
