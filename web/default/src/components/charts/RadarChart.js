import React from 'react';
import PropTypes from 'prop-types';
import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

const CHART_COLORS = [
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

/**
 * RadarChart Component
 * 
 * A multi-dimensional comparison chart for visualizing metrics across multiple axes.
 * Supports multiple data series for comparing different entities.
 * 
 * @param {Array} data - Array of objects with metric values for each dimension
 *                       Example: [{ dimension: 'Speed', channel1: 80, channel2: 65 }, ...]
 * @param {Array} dimensions - Array of dimension names to display on polar axes
 *                             Example: ['Speed', 'Reliability', 'Cost', 'Performance', 'Quality']
 * @param {Array} metrics - Array of metric keys from data objects
 *                          Example: ['channel1', 'channel2']
 * @param {string} dimensionKey - Key in data objects for dimension names (default: 'dimension')
 * @param {number} height - Chart height in pixels (default: 300)
 * @param {boolean} showLegend - Whether to show legend (default: true)
 * @param {boolean} showTooltip - Whether to show tooltip (default: true)
 * @param {Object} style - Additional styles for the chart container
 */
const RadarChart = ({
  data,
  dimensions,
  metrics,
  dimensionKey = 'dimension',
  height = 300,
  showLegend = true,
  showTooltip = true,
  style = {},
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const getColor = (index) => CHART_COLORS[index % CHART_COLORS.length];

  const tooltipStyle = {
    background: '#fff',
    border: 'none',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  const axisTickStyle = {
    fontSize: 12,
    fill: '#A3AED0',
  };

  const legendStyle = {
    paddingTop: '20px',
  };

  return (
    <div style={style}>
      <ResponsiveContainer width='100%' height={height}>
        <RechartsRadarChart
          data={data}
          cx='50%'
          cy='50%'
          outerRadius='80%'
        >
          <PolarGrid
            stroke='#E5E5E5'
            strokeDasharray='3 3'
          />
          <PolarAngleAxis
            dataKey={dimensionKey}
            tick={axisTickStyle}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 'auto']}
            tick={{ fontSize: 10, fill: '#A3AED0' }}
            tickCount={5}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [value, name]}
            />
          )}
          {showLegend && <Legend wrapperStyle={legendStyle} />}
          {metrics.map((metric, index) => (
            <Radar
              key={metric}
              name={metric}
              dataKey={metric}
              stroke={getColor(index)}
              fill={getColor(index)}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ))}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
};

RadarChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  dimensions: PropTypes.arrayOf(PropTypes.string),
  metrics: PropTypes.arrayOf(PropTypes.string).isRequired,
  dimensionKey: PropTypes.string,
  height: PropTypes.number,
  showLegend: PropTypes.bool,
  showTooltip: PropTypes.bool,
  style: PropTypes.object,
};

RadarChart.defaultProps = {
  dimensions: [],
  dimensionKey: 'dimension',
  height: 300,
  showLegend: true,
  showTooltip: true,
  style: {},
};

export default RadarChart;