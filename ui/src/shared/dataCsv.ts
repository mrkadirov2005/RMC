import { dataAPI, type DataEntity } from '@/shared/api/api';
import { showToast } from '@/utils/toast';

const getErrorText = (error: any, fallback: string) =>
  error?.response?.data?.error || error?.response?.data?.details || fallback;

export const importCsvEntity = async (entity: DataEntity, label: string, file?: File) => {
  if (!file) return false;
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast.error('Please choose a CSV file.');
    return false;
  }

  try {
    const csv = await file.text();
    await dataAPI.importEntity(entity, csv);
    showToast.success(`${label} imported successfully.`);
    return true;
  } catch (error: any) {
    showToast.error(getErrorText(error, `Failed to import ${label.toLowerCase()}.`));
    return false;
  }
};

export const exportCsvEntity = async (entity: DataEntity, label: string) => {
  try {
    const response = await dataAPI.exportEntity(entity);
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entity}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast.success(`${label} exported successfully.`);
  } catch (error: any) {
    showToast.error(getErrorText(error, `Failed to export ${label.toLowerCase()}.`));
  }
};
