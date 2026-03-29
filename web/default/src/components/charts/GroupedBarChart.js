import React from 'react';
import PropTypes from 'prop-types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './GroupedBarChart.css';

const BAR_COLORS = [
  '#4318FF',
  '#00B5D8',
  '#6C63FF',
  '#05CD99',
  '#FFB547',
  '#FF5E7D',
  '#41B883',
  '#7983FF',
  '#FF8F6B',
  '#49BEFF',
];

const DEFAULT_TOOLTIP_STYLE = {
  background: '#fff',
  border: 'none',
  borderRadius: '4px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

/**
 * GroupedBarChart Component
 * 
 * A reusable grouped bar chart component for comparing metrics across multiple categories.
 * Uses Recharts BarChart with multiple Bar components for grouped display.
 * 
 * @param {Array} data - Array of data objects with category values
 * @param {String} xAxisKey - Key for x-axis values (e.g., 'name', 'channel')
 * @param {Array} dataKeys - Array of data keys to display as bars (e.g., ['requests', 'quota', 'tokens'])
 * @param {Object} colors - Optional custom colors mapping for each data key
 * @param {Boolean} showLegend - Whether to show legend (default: true)
 * @param {Boolean} showTooltip - Whether to show tooltip (default: true)
 * @param {Number} height - Chart height (default: 300)
 * @param {Object} margin - Chart margin (default: { top: 20, right: 30, left: 20, bottom: 5 })
 * @param {String} layout - Chart layout 'horizontal' or 'vertical' (default: 'horizontal')
 * @param {Function} valueFormatter - Custom formatter for tooltip values
 * @param {Object} barConfig - Additional bar configuration (radius, etc.)
 */
const GroupedBarChart = ({
  data = [],
  xAxisKey = 'name',
  dataKeys = [],
  colors = {},
  showLegend = true,
  showTooltip = true,
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  layout = 'horizontal',
  valueFormatter,
  barConfig = {},
  legendFormatter,
  emptyMessage = 'No data available',
  loading = false,
}) => {
  const getColorForKey = (key, index) => colors[key] || BAR_COLORS[index % BAR_COLORS.length];

  const formatLegendValue = (value) => legendFormatter ? legendFormatter(value) : value;

  const formatTooltipValue = (value, name, props) => valueFormatter ? valueFormatter(value, name, props) : [value, name];

  if (!loading && (!data || data.length === 0)) {
    return (
      <div className='grouped-bar-chart-empty'>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='grouped-bar-chart-loading'>
        <div className='loading-spinner' />
      </div>
    );
  }

  const isVertical = layout === 'vertical';
  const axisConfig = isVertical
    ? { xAxis: { type: 'number', axisLine: false, tickLine: false }, yAxis: { dataKey: xAxisKey, type: 'category', axisLine: false, tickLine: false, width: 80 } }
    : { xAxis: { dataKey: xAxisKey, axisLine: false, tickLine: false }, yAxis: { type: 'number', axisLine: false, tickLine: false } };

  const barRadius = barConfig.radius || [4, 4, 0, 0];
  const barRadiusVertical = barConfig.radiusVertical || [0, 4, 4, 0];

  return (
    <div className='grouped-bar-chart-container'>
      <ResponsiveContainer width='100%' height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={margin}
          barGap={2}
          barCategoryGap='15%'
        >
          <CartesianGrid
            strokeDasharray='3 3'
            vertical={!isVertical}
            horizontal={isVertical}
            stroke='#E9ECEF'
            opacity={0.5}
          />
          <XAxis
            {...axisConfig.xAxis}
            tick={{ fontSize: 12, fill: '#A3AED0' }}
          />
          <YAxis
            {...axisConfig.yAxis}
            tick={{ fontSize: 12, fill: '#A3AED0' }}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={DEFAULT_TOOLTIP_STYLE}
              formatter={formatTooltipValue}
              cursor={{ fill: 'rgba(67, 24, 255, 0.1)' }}
            />
          )}
          {showLegend && (
            <Legend
              formatter={formatLegendValue}
              verticalAlign='top'
              height={36}
              iconType='circle'
              iconSize={10}
            />
          )}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={getColorForKey(key, index)}
              name={key}
              radius={isVertical ? barRadiusVertical : barRadius}
              maxBarSize={50}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

GroupedBarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  xAxisKey: PropTypes.string,
  dataKeys: PropTypes.arrayOf(PropTypes.string),
  colors: PropTypes.object,
  showLegend: PropTypes.bool,
  showTooltip: PropTypes.bool,
  height: PropTypes.number,
  margin: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    left: PropTypes.number,
    bottom: PropTypes.number,
  }),
  layout: PropTypes.oneOf(['horizontal', 'vertical']),
  valueFormatter: PropTypes.func,
  barConfig: PropTypes.shape({
    radius: PropTypes.arrayOf(PropTypes.number),
    radiusVertical: PropTypes.arrayOf(PropTypes.number),
  }),
  legendFormatter: PropTypes.func,
  emptyMessage: PropTypes.string,
  loading: PropTypes.bool,
};

export default GroupedBarChart;
export { BAR_COLORS };