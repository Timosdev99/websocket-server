import { createServer } from 'http';
import crypto from 'crypto';

const PORT = 3000;
const WEBSOCKET_MAGIC_STRING_KEY = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OPCODES = {
  TEXT: 0x01,
  CLOSE: 0x08
};

class WebSocketServer {
  constructor() {
    this.server = createServer(this.handleHttpRequest.bind(this));
    this.clients = new Set();
  }

  start() {
    this.server.listen(PORT, () => {
      console.log(`WebSocket server running on port ${PORT}`);
    });
    this.server.on('upgrade', this.handleUpgrade.bind(this));
  }

  handleHttpRequest(req, res) {
    res.writeHead(200);
    res.end('WebSocket server is running');
  }

  handleUpgrade(req, socket, head) {
    const websocketKey = req.headers['sec-websocket-key'];
    const acceptKey = this.generateAcceptKey(websocketKey);
    
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '', ''
    ].join('\r\n');

    socket.write(headers);
    socket.on('data', (data) => this.processFrame(socket, data));
    this.clients.add(socket);
  }

  generateAcceptKey(clientKey) {
    return crypto
      .createHash('sha1')
      .update(clientKey + WEBSOCKET_MAGIC_STRING_KEY)
      .digest('base64');
  }

  processFrame(socket, data) {
    try {
      const firstByte = data[0];
      const opCode = firstByte & 0x0F;
      
      if (opCode === OPCODES.CLOSE) {
        this.handleClientClose(socket);
        return;
      }

      const secondByte = data[1];
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLength = secondByte & 0x7F;
      let offset = 2;

      if (payloadLength === 126) {
        payloadLength = data.readUInt16BE(2);
        offset += 2;
      } else if (payloadLength === 127) {
        // 64-bit length handling (simplified)
        payloadLength = Number(data.readBigUInt64BE(2));
        offset += 8;
      }

      const maskKey = isMasked ? data.slice(offset, offset + 4) : null;
      offset += isMasked ? 4 : 0;

      const payload = data.slice(offset, offset + payloadLength);
      const decodedMessage = isMasked ? this.unmask(payload, maskKey) : payload;

      this.handleMessage(socket, decodedMessage);
    } catch (error) {
      console.error('Frame processing error:', error);
      this.handleClientClose(socket);
    }
  }
    
  unmask(payload, maskKey) {
    const unmaskedPayload = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      unmaskedPayload[i] = payload[i] ^ maskKey[i % 4];
    }
    return unmaskedPayload;
  }

  handleMessage(socket, message) {
    try {
      const text = message.toString('utf8');
      const parsedMessage = JSON.parse(text);
      console.log('Received:', parsedMessage);

      // Broadcast to all clients
      this.broadcastMessage(parsedMessage);
    } catch (error) {
      console.error('Message handling error:', error);
    }
  }

  broadcastMessage(message) {
    const frame = this.createFrame(JSON.stringify(message));
    for (const client of this.clients) {
      client.write(frame);
    }
  }

  createFrame(message) {
    const payload = Buffer.from(message);
    const length = payload.length;
    
    let headerLength = 2;
    if (length > 125) headerLength += 2;

    const frame = Buffer.alloc(headerLength + length);
    frame[0] = 0x81; // Text frame with FIN bit set

    if (length <= 125) {
      frame[1] = length;
    } else {
      frame[1] = 126;
      frame.writeUInt16BE(length, 2);
    }

    payload.copy(frame, headerLength);
    return frame;
  }

  handleClientClose(socket) {
    socket.end();
    this.clients.delete(socket);
  }
}

// Error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
const wsServer = new WebSocketServer();
wsServer.start();