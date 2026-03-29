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
import './StackedGroupedBarChart.css';

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
 * StackedGroupedBarChart Component
 *
 * A reusable stacked grouped bar chart for cross-dimensional analysis.
 * Groups bars by one dimension (e.g., channel) and stacks by another (e.g., model).
 *
 * @param {Array} data - Array of data objects with cross-dimensional values
 *                       Example: [{ channel: 'Channel A', gpt-4: 100, gpt-3.5: 50, claude: 30 }, ...]
 * @param {String} groupKey - Key for grouping (x-axis, e.g., 'channel')
 * @param {Array} stackKeys - Array of keys to stack within each group (e.g., ['gpt-4', 'gpt-3.5', 'claude'])
 * @param {Object} colors - Optional custom colors mapping for each stack key
 * @param {Boolean} showLegend - Whether to show legend (default: true)
 * @param {Boolean} showTooltip - Whether to show tooltip (default: true)
 * @param {Number} height - Chart height (default: 300)
 * @param {Object} margin - Chart margin (default: { top: 20, right: 30, left: 20, bottom: 5 })
 * @param {Function} valueFormatter - Custom formatter for tooltip values
 * @param {Function} legendFormatter - Custom formatter for legend labels
 * @param {String} emptyMessage - Message shown when no data
 * @param {Boolean} loading - Loading state
 */
const StackedGroupedBarChart = ({
  data = [],
  groupKey = 'name',
  stackKeys = [],
  colors = {},
  showLegend = true,
  showTooltip = true,
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  valueFormatter,
  legendFormatter,
  emptyMessage = 'No data available',
  loading = false,
}) => {
  const getColorForKey = (key, index) => colors[key] || BAR_COLORS[index % BAR_COLORS.length];

  const formatLegendValue = (value) => legendFormatter ? legendFormatter(value) : value;

  const formatTooltipValue = (value, name, props) => {
    if (valueFormatter) {
      return valueFormatter(value, name, props);
    }
    return [value, name];
  };

  // Custom tooltip content to show all stack values for hovered group
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div className='stacked-grouped-tooltip'>
        <div className='tooltip-label'>{label}</div>
        <div className='tooltip-items'>
          {payload.map((entry, index) => (
            <div key={index} className='tooltip-item'>
              <span
                className='tooltip-color'
                style={{ backgroundColor: entry.color }}
              />
              <span className='tooltip-name'>{entry.name}</span>
              <span className='tooltip-value'>
                {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
              </span>
            </div>
          ))}
        </div>
        <div className='tooltip-total'>
          Total: {valueFormatter
            ? valueFormatter(payload.reduce((sum, entry) => sum + entry.value, 0), 'total')
            : payload.reduce((sum, entry) => sum + entry.value, 0)}
        </div>
      </div>
    );
  };

  if (!loading && (!data || data.length === 0)) {
    return (
      <div className='stacked-grouped-bar-chart-empty'>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='stacked-grouped-bar-chart-loading'>
        <div className='loading-spinner' />
      </div>
    );
  }

  return (
    <div className='stacked-grouped-bar-chart-container'>
      <ResponsiveContainer width='100%' height={height}>
        <BarChart
          data={data}
          margin={margin}
          barGap={4}
          barCategoryGap='10%'
        >
          <CartesianGrid
            strokeDasharray='3 3'
            vertical={false}
            stroke='#E9ECEF'
            opacity={0.5}
          />
          <XAxis
            dataKey={groupKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#A3AED0' }}
          />
          <YAxis
            type='number'
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#A3AED0' }}
          />
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(67, 24, 255, 0.08)' }}
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
          {stackKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId='stack'
              fill={getColorForKey(key, index)}
              name={key}
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

StackedGroupedBarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  groupKey: PropTypes.string,
  stackKeys: PropTypes.arrayOf(PropTypes.string),
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
  valueFormatter: PropTypes.func,
  legendFormatter: PropTypes.func,
  emptyMessage: PropTypes.string,
  loading: PropTypes.bool,
};

StackedGroupedBarChart.defaultProps = {
  data: [],
  groupKey: 'name',
  stackKeys: [],
  colors: {},
  showLegend: true,
  showTooltip: true,
  height: 300,
  margin: { top: 20, right: 30, left: 20, bottom: 5 },
  emptyMessage: 'No data available',
  loading: false,
};

export default StackedGroupedBarChart;
export { BAR_COLORS };