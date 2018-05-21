const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.send('I love bacon');
});

io.on('connection', function(socket){
  console.log('user connected');
  socket.emit('news', { hello: 'world' });
  socket.on('chat message', function(msg){
    console.log(msg);
    io.emit('chat message', msg);
  });
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(PORT, function(){
  console.log(`Listening on port ${PORT}`);
});
