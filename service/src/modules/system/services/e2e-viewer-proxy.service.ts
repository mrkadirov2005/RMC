const net = require('net');
const { URL } = require('url');
const e2eRunnerService = require('./e2e-runner.service');

const VIEWER_SOCKET_PATH = '/api/system/dev/e2e/viewer/ws';

const rejectUpgrade = (socket: any, status: number, message: string) => {
  if (!socket.destroyed) {
    socket.end(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  }
};

const attachE2eViewerProxy = (server: any) => {
  server.on('upgrade', (request: any, clientSocket: any, head: Buffer) => {
    let url: any;
    try {
      url = new URL(String(request.url || ''), 'http://localhost');
    } catch {
      rejectUpgrade(clientSocket, 400, 'Bad Request');
      return;
    }

    if (url.pathname !== VIEWER_SOCKET_PATH) {
      rejectUpgrade(clientSocket, 404, 'Not Found');
      return;
    }

    const token = String(url.searchParams.get('token') || '');
    if (!token || !e2eRunnerService.isViewerTokenValid(token)) {
      rejectUpgrade(clientSocket, 401, 'Unauthorized');
      return;
    }

    const upstreamPort = Number(process.env.E2E_NOVNC_INTERNAL_PORT || 6080);
    const upstream = net.connect({ host: '127.0.0.1', port: upstreamPort });
    upstream.once('connect', () => {
      const headers = Object.entries(request.headers || {})
        .filter(([name]) => name.toLowerCase() !== 'host')
        .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\r\n');
      upstream.write(`GET /websockify HTTP/${request.httpVersion || '1.1'}\r\nHost: 127.0.0.1:${upstreamPort}\r\n${headers}\r\n\r\n`);
      if (head?.length) upstream.write(head);
      clientSocket.pipe(upstream).pipe(clientSocket);
    });
    upstream.once('error', () => rejectUpgrade(clientSocket, 503, 'Service Unavailable'));
    clientSocket.once('error', () => upstream.destroy());
    clientSocket.once('close', () => upstream.destroy());
  });
};

module.exports = { attachE2eViewerProxy, VIEWER_SOCKET_PATH };

export {};
