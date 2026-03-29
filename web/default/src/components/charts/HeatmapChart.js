import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './HeatmapChart.css';

const GRADIENT_COLORS_FROM_LIGHT_TO_DARK = [
  '#E6F7FF',
  '#BAE7FF',
  '#91D5FF',
  '#69C0FF',
  '#40A9FF',
  '#1890FF',
  '#0050B3',
  '#4318FF',
];

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const HeatmapChart = ({ data, metric = 'request_count', height = 300 }) => {
  const { t } = useTranslation();
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const heatmapData = useMemo(() => {
    const grid = {};
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        grid[`${day}-${hour}`] = 0;
      }
    }

    if (data && Array.isArray(data)) {
      data.forEach((item) => {
        const day = item.weekday !== undefined ? item.weekday : 0;
        const hour = item.hour !== undefined ? item.hour : 0;
        const value = item[metric] || 0;
        
        if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
          grid[`${day}-${hour}`] = value;
        }
      });
    }

    return grid;
  }, [data, metric]);

  const maxValue = useMemo(() => {
    const values = Object.values(heatmapData);
    return Math.max(...values, 1);
  }, [heatmapData]);

  const getColorForValue = (value) => {
    if (value === 0) return GRADIENT_COLORS_FROM_LIGHT_TO_DARK[0];
    
    const normalizedValue = value / maxValue;
    const colorIndex = Math.min(
      Math.floor(normalizedValue * (GRADIENT_COLORS_FROM_LIGHT_TO_DARK.length - 1)),
      GRADIENT_COLORS_FROM_LIGHT_TO_DARK.length - 1
    );
    return GRADIENT_COLORS_FROM_LIGHT_TO_DARK[colorIndex];
  };

  const handleCellHover = (day, hour, value, event) => {
    const cellRect = event.currentTarget.getBoundingClientRect();
    const containerRect = event.currentTarget.closest('.heatmap-container').getBoundingClientRect();
    
    setHoveredCell({ day, hour, value });
    setTooltipPosition({
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top - 10,
    });
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
  };

  const cellWidthPercent = 100 / 24;
  const cellHeightPercent = 100 / 7;

  const formatMetricValue = (value) => {
    if (metric === 'quota') {
      return `$${(value / 1000000).toFixed(6)}`;
    }
    return value.toLocaleString();
  };

  const getWeekdayLabel = (dayIndex) => {
    const key = WEEKDAY_KEYS[dayIndex];
    return t(`dashboard.charts.heatmap.weekday.${key}`, key.charAt(0).toUpperCase() + key.slice(1));
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'request_count':
        return t('dashboard.stats.charts.requests_tooltip', 'Requests');
      case 'quota':
        return t('dashboard.stats.charts.quota_tooltip', 'Quota');
      case 'tokens':
        return t('dashboard.charts.tokens.tooltip', 'Tokens');
      default:
        return metric;
    }
  };

  return (
    <div className='heatmap-wrapper' style={{ height }}>
      <div className='heatmap-container'>
        <div className='heatmap-y-axis'>
          {WEEKDAY_KEYS.map((_, dayIndex) => (
            <div
              key={dayIndex}
              className='heatmap-y-label'
              style={{ height: `${cellHeightPercent}%` }}
            >
              {getWeekdayLabel(dayIndex)}
            </div>
          ))}
        </div>

        <div className='heatmap-grid'>
          <div className='heatmap-x-axis'>
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className='heatmap-x-label'
                style={{ width: `${cellWidthPercent}%` }}
              >
                {hour}
              </div>
            ))}
          </div>

          <div className='heatmap-cells'>
            {WEEKDAY_KEYS.map((_, day) => (
              <div key={day} className='heatmap-row' style={{ height: `${cellHeightPercent}%` }}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const value = heatmapData[`${day}-${hour}`];
                  const color = getColorForValue(value);
                  const isHovered = hoveredCell?.day === day && hoveredCell?.hour === hour;

                  return (
                    <div
                      key={hour}
                      className={`heatmap-cell ${isHovered ? 'hovered' : ''}`}
                      style={{
                        width: `${cellWidthPercent}%`,
                        backgroundColor: color,
                      }}
                      onMouseEnter={(e) => handleCellHover(day, hour, value, e)}
                      onMouseLeave={handleCellLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {hoveredCell && (
          <div
            className='heatmap-tooltip'
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
            }}
          >
            <div className='tooltip-header'>
              {getWeekdayLabel(hoveredCell.day)} {hoveredCell.hour}:00
            </div>
            <div className='tooltip-value'>
              {getMetricLabel()}: {formatMetricValue(hoveredCell.value)}
            </div>
          </div>
        )}
      </div>

      <div className='heatmap-legend'>
        <span className='legend-label'>{t('dashboard.charts.heatmap.less', 'Less')}</span>
        <div className='legend-scale'>
          {GRADIENT_COLORS_FROM_LIGHT_TO_DARK.map((color, index) => (
            <div
              key={index}
              className='legend-cell'
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className='legend-label'>{t('dashboard.charts.heatmap.more', 'More')}</span>
      </div>
    </div>
  );
};

export default HeatmapChart;