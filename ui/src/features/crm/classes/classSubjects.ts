const unwrapRows = (response: any): any[] => {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.data) ? data.data : [];
};

export const resolveClassSubjects = (classData: any, response: any) => {
  const rows = unwrapRows(response);
  if (rows.length > 0) return rows;
  if (!classData?.subject_name) return [];
  return [{
    subject_id: classData.subject_id,
    class_id: classData.class_id || classData.id,
    subject_name: classData.subject_name,
  }];
};
