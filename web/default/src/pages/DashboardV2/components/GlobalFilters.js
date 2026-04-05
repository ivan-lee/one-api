import React from 'react';
import { useTranslation } from 'react-i18next';
import { Segment } from 'semantic-ui-react';
import { useDashboard } from '../context/DashboardContext';
import DatePickerWithPresets from '../../../components/DatePickerWithPresets';
import GranularitySelector from '../../../components/GranularitySelector';

const GlobalFilters = () => {
  const { t } = useTranslation();
  const { timeRange, setTimeRange, granularity, setGranularity } = useDashboard();

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  const handleGranularityChange = (value) => {
    setGranularity(value);
  };

  return (
    <Segment
      className='global-filters'
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        marginBottom: '1rem',
        padding: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 500, color: '#666' }}>
            {t('dashboard.date_picker.title') || '时间范围'}
          </label>
          <DatePickerWithPresets
            onChange={handleTimeRangeChange}
            defaultPreset={timeRange?.preset || '7d'}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 500, color: '#666' }}>
            {t('dashboard.granularity.title') || '粒度'}
          </label>
          <GranularitySelector
            value={granularity}
            onChange={handleGranularityChange}
          />
        </div>
      </div>
    </Segment>
  );
};

export default GlobalFilters;
