const repository = require('../repositories/parent_link_request.repository');

const listRequests = (centerId?: number, status?: string) => repository.list(centerId, status);

const approveRequest = (id: number, centerId?: number, decidedById?: number | null) => repository.approve(id, centerId, decidedById ?? null);

const rejectRequest = (id: number, centerId?: number, decidedById?: number | null) => repository.reject(id, centerId, decidedById ?? null);

module.exports = { listRequests, approveRequest, rejectRequest };

export {};
