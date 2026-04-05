import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Popup } from 'semantic-ui-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import zhCN from 'date-fns/locale/zh-CN';
import enUS from 'date-fns/locale/en-US';
import './DatePickerWithPresets.css';

registerLocale('zh-CN', zhCN);
registerLocale('en-US', enUS);

const DatePickerWithPresets = ({
  onChange,
  defaultPreset = '7d',
  presets,
}) => {
  const { t, i18n } = useTranslation();
  const [activePreset, setActivePreset] = useState(defaultPreset);
  const [customDateRange, setCustomDateRange] = useState([null, null]);
  const [startDate, endDate] = customDateRange;
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const datePickerRef = useRef(null);

  const defaultPresets = [
    { key: '7d', label: t('dashboard.date_picker.presets.7d') || '7天', value: '7d' },
    { key: '14d', label: t('dashboard.date_picker.presets.14d') || '14天', value: '14d' },
    { key: '30d', label: t('dashboard.date_picker.presets.30d') || '30天', value: '30d' },
    { key: '90d', label: t('dashboard.date_picker.presets.90d') || '90天', value: '90d' },
    { key: 'this_month', label: t('dashboard.date_picker.presets.this_month') || '本月', value: 'this_month' },
    { key: 'last_month', label: t('dashboard.date_picker.presets.last_month') || '上月', value: 'last_month' },
    { key: 'custom', label: t('dashboard.date_picker.presets.custom') || '自定义', value: 'custom' },
  ];

  const presetOptions = presets || defaultPresets;

  const calculateTimestamps = (preset, customStart, customEnd) => {
    const now = Math.floor(Date.now() / 1000);
    let startTimestamp = 0;
    let endTimestamp = now;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    switch (preset) {
      case '7d':
        startTimestamp = now - 7 * 24 * 60 * 60;
        break;
      case '14d':
        startTimestamp = now - 14 * 24 * 60 * 60;
        break;
      case '30d':
        startTimestamp = now - 30 * 24 * 60 * 60;
        break;
      case '90d':
        startTimestamp = now - 90 * 24 * 60 * 60;
        break;
      case 'this_month':
        // Month boundaries: day 1 at 00:00:00 to last day at 23:59:59
        const firstDayThisMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0);
        startTimestamp = Math.floor(firstDayThisMonth.getTime() / 1000);
        const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        endTimestamp = Math.floor(lastDayThisMonth.getTime() / 1000);
        break;
      case 'last_month':
        // Month boundaries: day 1 at 00:00:00 to last day at 23:59:59
        const firstDayLastMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0);
        startTimestamp = Math.floor(firstDayLastMonth.getTime() / 1000);
        const lastDayLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        endTimestamp = Math.floor(lastDayLastMonth.getTime() / 1000);
        break;
      case 'custom':
        if (customStart && customEnd) {
          // Day boundaries: 00:00:00 to 23:59:59
          const customStartDate = new Date(customStart);
          customStartDate.setHours(0, 0, 0, 0);
          startTimestamp = Math.floor(customStartDate.getTime() / 1000);
          const customEndDate = new Date(customEnd);
          customEndDate.setHours(23, 59, 59, 999);
          endTimestamp = Math.floor(customEndDate.getTime() / 1000);
        } else {
          return null;
        }
        break;
      default:
        startTimestamp = 0;
    }

    return { startTimestamp, endTimestamp, preset };
  };

  const handlePresetClick = (presetValue) => {
    setActivePreset(presetValue);
    setIsPopupOpen(false);

    if (presetValue === 'custom') {
      setIsPopupOpen(true);
    } else {
      const result = calculateTimestamps(presetValue);
      if (result && onChange) {
        onChange(result);
      }
    }
  };

  const handleCustomDateChange = (dates) => {
    const [start, end] = dates;
    setCustomDateRange([start, end]);

    if (start && end) {
      setActivePreset('custom');
      setIsPopupOpen(false);
      const result = calculateTimestamps('custom', start, end);
      if (result && onChange) {
        onChange(result);
      }
    }
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
  };

  useEffect(() => {
    if (defaultPreset !== 'custom') {
      console.log('[DatePickerWithPresets] defaultPreset 变化:', defaultPreset);
      const result = calculateTimestamps(defaultPreset);
      if (result && onChange) {
        console.log('[DatePickerWithPresets] 触发 onChange:', result);
        onChange(result);
      }
    }
  }, [defaultPreset]); // 修复：defaultPreset 变化时需要重新触发

  const datePickerLocale = i18n.language === 'zh' || i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

  const formatDateDisplay = (date) => {
    if (!date) return '';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString(datePickerLocale === 'zh-CN' ? 'zh-CN' : 'en-US', options);
  };

  const customRangeDisplay = startDate && endDate 
    ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
    : '';

  return (
    <div className='date-picker-with-presets'>
      <Button.Group size='small' className='preset-buttons-group'>
        {presetOptions.filter(p => p.value !== 'custom').map((preset) => (
          <Button
            key={preset.key}
            active={activePreset === preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={`preset-button ${activePreset === preset.value ? 'active-preset' : ''}`}
          >
            {preset.label}
          </Button>
        ))}
        <Popup
          trigger={presetOptions.find(p => p.value === 'custom') && (
            <Button
              active={activePreset === 'custom'}
              className={`preset-button ${activePreset === 'custom' ? 'active-preset' : ''}`}
            >
              {presetOptions.find(p => p.value === 'custom').label}
              {customRangeDisplay && (
                <span className='custom-range-display'> ({customRangeDisplay})</span>
              )}
            </Button>
          )}
          open={isPopupOpen}
          onOpen={() => setIsPopupOpen(true)}
          onClose={handlePopupClose}
          on='click'
          position='bottom center'
          flowing
          className='date-picker-popup'
        >
          <Popup.Content>
            <div className='custom-date-picker-container'>
              <DatePicker
                selected={startDate}
                onChange={handleCustomDateChange}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                inline
                locale={datePickerLocale}
                dateFormat='yyyy/MM/dd'
                maxDate={new Date()}
                showMonthDropdown
                showYearDropdown
                dropdownMode='select'
                ref={datePickerRef}
              />
            </div>
          </Popup.Content>
        </Popup>
      </Button.Group>
      {customRangeDisplay && activePreset === 'custom' && (
        <div className='selected-range-info'>
          {customRangeDisplay}
        </div>
      )}
    </div>
  );
};

export default DatePickerWithPresets;