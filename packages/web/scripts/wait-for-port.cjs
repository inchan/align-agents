const net = require('net');

const port = process.env.WAIT_PORT || 3001;
const timeout = 1000; // 1 second
const maxRetries = 30; // 30 seconds max

let retries = 0;

function checkPort() {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.on('connect', () => {
        console.log(`Port ${port} is ready! Starting web server...`);
        socket.destroy();
        process.exit(0);
    });

    socket.on('timeout', () => {
        socket.destroy();
        retry();
    });

    socket.on('error', (err) => {
        socket.destroy();
        retry();
    });

    socket.connect(port, 'localhost');
}

function retry() {
    retries++;
    if (retries > maxRetries) {
        console.error(`Timeout waiting for port ${port}`);
        process.exit(1);
    }
    setTimeout(checkPort, timeout);
}

console.log(`Waiting for port ${port}...`);
checkPort();
