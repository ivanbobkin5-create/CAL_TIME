const net = require('net');
const client = new net.Socket();
client.setTimeout(5000);
client.connect(465, 'smtp.timeweb.ru', function() {
    console.log('Connected');
    client.destroy();
});
client.on('error', function(err) {
    console.error('Error:', err.message);
});
client.on('timeout', function() {
    console.error('Timeout');
    client.destroy();
});
