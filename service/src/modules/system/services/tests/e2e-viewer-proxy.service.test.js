const { EventEmitter } = require('events');

describe('E2E viewer WebSocket proxy', () => {
  const attach = require('../e2e-viewer-proxy.service').attachE2eViewerProxy;

  const requestUpgrade = (url) => {
    const server = new EventEmitter();
    const socket = new EventEmitter();
    socket.destroyed = false;
    socket.end = jest.fn();
    attach(server);
    server.emit('upgrade', { url, headers: {}, httpVersion: '1.1' }, socket, Buffer.alloc(0));
    return socket;
  };

  test('rejects unrelated WebSocket paths', () => {
    expect(requestUpgrade('/not-the-viewer').end).toHaveBeenCalledWith(expect.stringContaining('404 Not Found'));
  });

  test('rejects a viewer connection without the active run token', () => {
    expect(requestUpgrade('/api/system/dev/e2e/viewer/ws?token=wrong').end)
      .toHaveBeenCalledWith(expect.stringContaining('401 Unauthorized'));
  });
});
