export const unwrapRows = (response: any) => {
  const data = response?.data ?? response;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};
