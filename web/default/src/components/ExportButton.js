import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'semantic-ui-react';
import { API } from '../helpers/api';
import { showError, showSuccess } from '../helpers/utils';

const ExportButton = ({ filters = {} }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startTimestamp) {
        params.append('start_timestamp', filters.startTimestamp);
      }
      if (filters.endTimestamp) {
        params.append('end_timestamp', filters.endTimestamp);
      }
      if (filters.dimension) {
        params.append('dimension', filters.dimension);
      }
      if (filters.channelId) {
        params.append('channel_id', filters.channelId);
      }
      if (filters.userGroup) {
        params.append('user_group', filters.userGroup);
      }
      if (filters.channelGroup) {
        params.append('channel_group', filters.channelGroup);
      }
      if (filters.model) {
        params.append('model', filters.model);
      }
      if (filters.granularity) {
        params.append('granularity', filters.granularity);
      }

      const queryString = params.toString();
      const url = `/api/stats/export${queryString ? '?' + queryString : ''}`;

      const response = await fetch(API.defaults.baseURL + url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      let filename = `stats_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showSuccess(t('dashboard.export_success') || '导出成功');
    } catch (error) {
      console.error('Export error:', error);
      showError(t('dashboard.export_failed') || '导出失败：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      icon="download"
      content={t('dashboard.export') || '导出'}
      onClick={handleExport}
      loading={loading}
      disabled={loading}
      primary
    />
  );
};

export default ExportButton;