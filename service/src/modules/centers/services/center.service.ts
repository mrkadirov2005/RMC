const centerRepository = require('../repositories/center.repository');
const { isCenterAdmin } = require('../../../shared/tenant');

const listCenters = (user?: any) => {
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return centerRepository.findAll(centerId);
};

const getCenter = (id: number, user?: any) => {
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return centerRepository.findById(id, centerId);
};

const createCenter = (body: any) => {
  const { center_name, center_code, email, phone, address, city, principal_name } = body;
  return centerRepository.insert([center_name, center_code, email, phone, address, city, principal_name]);
};

const updateCenter = (id: number, body: any, user?: any) => {
  const { center_name, email, phone, address, city, principal_name } = body;
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return centerRepository.update(id, [center_name, email, phone, address, city, principal_name], centerId);
};

const deleteCenter = (id: number, user?: any) => {
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return centerRepository.remove(id, centerId);
};

module.exports = { listCenters, getCenter, createCenter, updateCenter, deleteCenter };

export {};
