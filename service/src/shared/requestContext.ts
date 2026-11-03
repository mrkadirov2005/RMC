// The signed-in user of the request being handled, for code far from `req` (the audit log).
const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

const runWithUser = (user: any, callback: () => void) => storage.run({ user }, callback);

const currentUser = () => storage.getStore()?.user ?? null;

module.exports = { runWithUser, currentUser };

export {};
