import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Grid, Loader, Message } from 'semantic-ui-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import axios from 'axios';
import DatePickerWithPresets from '../../components/DatePickerWithPresets';
import DimensionFilter from '../../components/DimensionFilter';
import GranularitySelector from '../../components/GranularitySelector';
import GroupedBarChart from '../../components/charts/GroupedBarChart';
import HeatmapChart from '../../components/charts/HeatmapChart';
import RadarChart from '../../components/charts/RadarChart';
import StackedGroupedBarChart from '../../components/charts/StackedGroupedBarChart';
import './Dashboard.css';

const chartConfig = {
  lineChart: {
    style: {
      background: '#fff',
      borderRadius: '8px',
    },
    line: {
      strokeWidth: 2,
      dot: false,
      activeDot: { r: 4 },
    },
    grid: {
      vertical: false,
      horizontal: true,
      opacity: 0.1,
    },
  },
  colors: {
    requests: '#4318FF',
    quota: '#00B5D8',
    tokens: '#6C63FF',
  },
  barColors: [
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
  ],
};

const Dashboard = () => {
  const { t } = useTranslation();
  
  const [timeRange, setTimeRange] = useState({
    startTimestamp: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
    endTimestamp: Math.floor(Date.now() / 1000),
    preset: '7d',
  });
  
  const [filters, setFilters] = useState({
    channel: 'all',
    model: 'all',
  });
  
  const [granularity, setGranularity] = useState('day');
  
  const [data, setData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [summaryData, setSummaryData] = useState({
    todayRequests: 0,
    todayQuota: 0,
    todayTokens: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        start_timestamp: timeRange.startTimestamp,
        end_timestamp: timeRange.endTimestamp,
        granularity,
      };
      
      if (filters.channel !== 'all') {
        params.channel_id = filters.channel;
      }
      if (filters.model !== 'all') {
        params.model_name = filters.model;
      }
      
      const response = await axios.get('/api/user/dashboard', { params });
      
      if (response.data.success) {
        const dashboardData = response.data.data || [];
        setData(dashboardData);
        calculateSummary(dashboardData);
      } else {
        setError(response.data.message || t('dashboard.stats.error.load_failed'));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(t('dashboard.stats.error.load_failed'));
      setData([]);
      calculateSummary([]);
    }
    
    setLoading(false);
  }, [timeRange, filters, granularity, t]);

  const fetchHeatmapData = useCallback(async () => {
    setHeatmapLoading(true);
    
    try {
      const params = {
        start_timestamp: timeRange.startTimestamp,
        end_timestamp: timeRange.endTimestamp,
      };
      
      if (filters.channel !== 'all') {
        params.channel_id = filters.channel;
      }
      
      const response = await axios.get('/api/stats/heatmap', { params });
      
      if (response.data.success) {
        setHeatmapData(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch heatmap data:', err);
      setHeatmapData([]);
    }
    
    setHeatmapLoading(false);
  }, [timeRange, filters]);

  const fetchChannelData = useCallback(async () => {
    try {
      const params = {
        start_timestamp: timeRange.startTimestamp,
        end_timestamp: timeRange.endTimestamp,
      };
      
      const response = await axios.get('/api/stats/channels', { params });
      
      if (response.data.success) {
        const channels = response.data.data || [];
        const chartData = channels.slice(0, 10).map(channel => ({
          name: channel.channel_name || `Channel #${channel.channel_id}`,
          requests: channel.request_count || 0,
          quota: (channel.quota || 0) / 1000000,
          tokens: channel.total_tokens || 0,
        }));
        setChannelData(chartData);
      }
    } catch (err) {
      console.error('Failed to fetch channel data:', err);
      setChannelData([]);
    }
  }, [timeRange]);

  const calculateSummary = (dashboardData) => {
    if (!Array.isArray(dashboardData) || dashboardData.length === 0) {
      setSummaryData({
        todayRequests: 0,
        todayQuota: 0,
        todayTokens: 0,
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayData = dashboardData.filter((item) => {
      const slot = item.time_slot;
      if (granularity === 'day') {
        return slot === today;
      }
      if (granularity === 'hour') {
        return slot.startsWith(today);
      }
      return false;
    });

    const summary = {
      todayRequests: todayData.reduce(
        (sum, item) => sum + (item.request_count || 0),
        0
      ),
      todayQuota:
        todayData.reduce((sum, item) => sum + (item.quota || 0), 0) / 1000000,
      todayTokens: todayData.reduce(
        (sum, item) => sum + (item.prompt_tokens || 0) + (item.completion_tokens || 0),
        0
      ),
    };

    setSummaryData(summary);
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };

  const handleFilterChange = (activeFilters, allFilters) => {
    setFilters({
      channel: allFilters.channel || 'all',
      model: allFilters.model || 'all',
    });
  };

  const handleGranularityChange = (newGranularity) => {
    setGranularity(newGranularity);
  };

  const buildTimeSeriesData = () => {
    const timeData = {};

    // Generate time slots based on selected time range, not just data
    const generateTimeSlotsFromRange = () => {
      const slots = [];
      const startMs = timeRange.startTimestamp * 1000;
      const endMs = timeRange.endTimestamp * 1000;
      
      switch (granularity) {
        case 'hour': {
          // Start from the beginning of the start hour
          const startDate = new Date(startMs);
          startDate.setMinutes(0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setMinutes(0, 0, 0);
          for (let h = new Date(startDate); h <= endDate; h.setHours(h.getHours() + 1)) {
            slots.push(h.toISOString().slice(0, 13).replace('T', ' ') + ':00');
          }
          break;
        }
        case 'day': {
          // Start from the beginning of the start day
          const startDate = new Date(startMs);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setHours(0, 0, 0, 0);
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            slots.push(d.toISOString().split('T')[0]);
          }
          break;
        }
        case 'week': {
          // For week, generate week-start dates
          const startDate = new Date(startMs);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setHours(0, 0, 0, 0);
          for (let w = new Date(startDate); w <= endDate; w.setDate(w.getDate() + 7)) {
            slots.push(w.toISOString().split('T')[0]);
          }
          break;
        }
        case 'month': {
          // For month, generate first day of each month
          const startDate = new Date(startMs);
          const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          const endDate = new Date(endMs);
          const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
            slots.push(m.toISOString().split('T')[0]);
          }
          break;
        }
        default: {
          const startDate = new Date(startMs);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setHours(0, 0, 0, 0);
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            slots.push(d.toISOString().split('T')[0]);
          }
        }
      }
      return slots;
    };

    const slots = generateTimeSlotsFromRange();

    // Initialize all slots with zero values
    slots.forEach((slot) => {
      timeData[slot] = {
        time_slot: slot,
        requests: 0,
        quota: 0,
        tokens: 0,
      };
    });

    // Fill with actual data
    data.forEach((item) => {
      const slot = item.time_slot;
      if (timeData[slot]) {
        timeData[slot].requests += item.request_count || 0;
        timeData[slot].quota += (item.quota || 0) / 1000000;
        timeData[slot].tokens += (item.prompt_tokens || 0) + (item.completion_tokens || 0);
      }
    });

    return Object.values(timeData).sort((a, b) =>
      a.time_slot.localeCompare(b.time_slot)
    );
  };

  const buildModelStackedData = () => {
    const timeData = {};

    // Generate time slots based on selected time range
    const generateTimeSlotsFromRange = () => {
      const slots = [];
      const startMs = timeRange.startTimestamp * 1000;
      const endMs = timeRange.endTimestamp * 1000;
      
      switch (granularity) {
        case 'hour': {
          const startDate = new Date(startMs);
          startDate.setMinutes(0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setMinutes(0, 0, 0);
          for (let h = new Date(startDate); h <= endDate; h.setHours(h.getHours() + 1)) {
            slots.push(h.toISOString().slice(0, 13).replace('T', ' ') + ':00');
          }
          break;
        }
        case 'day': {
          const startDate = new Date(startMs);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setHours(0, 0, 0, 0);
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            slots.push(d.toISOString().split('T')[0]);
          }
          break;
        }
        case 'week': {
          const startDate = new Date(startMs);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setHours(0, 0, 0, 0);
          for (let w = new Date(startDate); w <= endDate; w.setDate(w.getDate() + 7)) {
            slots.push(w.toISOString().split('T')[0]);
          }
          break;
        }
        case 'month': {
          const startDate = new Date(startMs);
          const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          const endDate = new Date(endMs);
          const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          for (let m = new Date(startMonth); m <= endMonth; m.setMonth(m.getMonth() + 1)) {
            slots.push(m.toISOString().split('T')[0]);
          }
          break;
        }
        default: {
          const startDate = new Date(startMs);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endMs);
          endDate.setHours(0, 0, 0, 0);
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            slots.push(d.toISOString().split('T')[0]);
          }
        }
      }
      return slots;
    };

    const slots = generateTimeSlotsFromRange();

    const models = [...new Set(data.map((item) => item.model_name))];

    slots.forEach((slot) => {
      timeData[slot] = {
        time_slot: slot,
      };
      models.forEach((model) => {
        timeData[slot][model] = 0;
      });
    });

    data.forEach((item) => {
      const slot = item.time_slot;
      if (timeData[slot]) {
        timeData[slot][item.model_name] =
          (item.prompt_tokens || 0) + (item.completion_tokens || 0);
      }
    });

    return Object.values(timeData).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  };

  const getUniqueModels = () => {
    return [...new Set(data.map((item) => item.model_name))];
  };

  const buildRadarChartData = () => {
    const modelMetrics = {};
    
    data.forEach(item => {
      const modelName = item.model_name || 'Unknown';
      if (!modelMetrics[modelName]) {
        modelMetrics[modelName] = {
          requests: 0,
          quota: 0,
          tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
        };
      }
      modelMetrics[modelName].requests += item.request_count || 0;
      modelMetrics[modelName].quota += item.quota || 0;
      modelMetrics[modelName].tokens += (item.prompt_tokens || 0) + (item.completion_tokens || 0);
      modelMetrics[modelName].prompt_tokens += item.prompt_tokens || 0;
      modelMetrics[modelName].completion_tokens += item.completion_tokens || 0;
    });

    const topModels = Object.entries(modelMetrics)
      .sort((a, b) => b[1].requests - a[1].requests)
      .slice(0, 5)
      .map(([name]) => name);

    const dimensions = ['requests', 'quota', 'tokens', 'prompt_tokens', 'completion_tokens'];
    
    const maxValues = {};
    dimensions.forEach(dim => {
      maxValues[dim] = Math.max(...topModels.map(m => modelMetrics[m][dim] || 0), 1);
    });

    return dimensions.map(dim => {
      const result = { dimension: t(`dashboard.charts.radar.${dim}`, dim) };
      topModels.forEach(model => {
        const value = modelMetrics[model][dim] || 0;
        result[model] = Math.round((value / maxValues[dim]) * 100);
      });
      return result;
    });
  };

  const buildStackedGroupedChartData = () => {
    const channelModelData = {};
    
    data.forEach(item => {
      const channelName = item.ChannelName || `Channel #${item.ChannelId || 0}`;
      const modelName = item.model_name || 'Unknown';
      
      if (!channelModelData[channelName]) {
        channelModelData[channelName] = { channel: channelName };
      }
      
      channelModelData[channelName][modelName] = 
        (channelModelData[channelName][modelName] || 0) + 
        (item.prompt_tokens || 0) + (item.completion_tokens || 0);
    });

    const topChannels = Object.keys(channelModelData).slice(0, 6);
    const allModels = [...new Set(data.map(item => item.model_name))].slice(0, 5);

    return topChannels.map(channel => {
      const result = { channel };
      allModels.forEach(model => {
        result[model] = channelModelData[channel][model] || 0;
      });
      return result;
    });
  };

  const getColorByIndex = (index) => {
    return chartConfig.barColors[index % chartConfig.barColors.length];
  };

  const formatTimeByGranularity = (timeSlot) => {
    if (!timeSlot) return '';
    
    switch (granularity) {
      case 'hour':
        const hourDate = new Date(timeSlot.replace(' ', 'T'));
        return hourDate.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'day':
        const dayDate = new Date(timeSlot);
        return dayDate.toLocaleDateString('zh-CN', {
          month: 'numeric',
          day: 'numeric',
        });
      case 'week':
        return timeSlot;
      case 'month':
        return timeSlot;
      default:
        const defaultDate = new Date(timeSlot);
        return defaultDate.toLocaleDateString('zh-CN', {
          month: 'numeric',
          day: 'numeric',
        });
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchHeatmapData();
    fetchChannelData();
  }, [fetchDashboardData, fetchHeatmapData, fetchChannelData]);

  const timeSeriesData = buildTimeSeriesData();
  const modelData = buildModelStackedData();
  const models = getUniqueModels();
  const radarData = buildRadarChartData();
  const stackedGroupedData = buildStackedGroupedChartData();

  // Calculate optimal interval based on data length to prevent label overlap
  const calculateXAxisInterval = (dataLength) => {
    if (!dataLength || dataLength <= 7) return 0; // Show all for short ranges
    if (dataLength <= 14) return 1; // Show every 2nd label
    if (dataLength <= 30) return Math.ceil(dataLength / 8); // ~8 labels max
    if (dataLength <= 90) return Math.ceil(dataLength / 10); // ~10 labels max
    return Math.ceil(dataLength / 12); // ~12 labels max for longer ranges
  };

  const xAxisInterval = calculateXAxisInterval(timeSeriesData?.length || 0);

  const xAxisConfig = {
    dataKey: 'time_slot',
    axisLine: false,
    tickLine: false,
    tick: {
      fontSize: 12,
      fill: '#A3AED0',
      textAnchor: 'middle',
    },
    tickFormatter: formatTimeByGranularity,
    interval: xAxisInterval,
    minTickGap: 35, // Increased gap to prevent overlap
    padding: { left: 30, right: 30 },
  };

  if (loading && data.length === 0) {
    return (
      <div className='dashboard-container'>
        <Loader active size='large' className='dashboard-loader'>
          {t('dashboard.stats.loading')}
        </Loader>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className='dashboard-container'>
        <Message negative>
          <Message.Header>{t('dashboard.stats.error.title')}</Message.Header>
          <p>{error}</p>
        </Message>
      </div>
    );
  }

  return (
    <div className='dashboard-container'>
      <div className='dashboard-controls'>
        <div className='controls-row'>
          <div className='control-section date-picker-section'>
            <label className='control-label'>{t('dashboard.date_picker.title')}</label>
            <DatePickerWithPresets
              onChange={handleTimeRangeChange}
              defaultPreset='7d'
            />
          </div>
          <div className='control-section granularity-section'>
            <label className='control-label'>{t('dashboard.granularity.title')}</label>
            <GranularitySelector
              value={granularity}
              onChange={handleGranularityChange}
            />
          </div>
          <div className='control-section filter-section'>
            <label className='control-label'>{t('dashboard.filters.title')}</label>
            <DimensionFilter
              dimensions={['channel', 'model']}
              onChange={handleFilterChange}
              value={filters}
              timeRange={timeRange}
            />
          </div>
        </div>
      </div>

      <Grid columns={3} stackable className='charts-grid'>
        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                {t('dashboard.charts.requests.title')}
              </Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer
                  width='100%'
                  height={120}
                  margin={{ left: 10, right: 10 }}
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={chartConfig.lineChart.grid.vertical}
                      horizontal={chartConfig.lineChart.grid.horizontal}
                      opacity={chartConfig.lineChart.grid.opacity}
                    />
                    <XAxis {...xAxisConfig} />
                    <YAxis hide={true} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [
                        value,
                        t('dashboard.charts.requests.tooltip'),
                      ]}
                      labelFormatter={(label) =>
                        `${t('dashboard.statistics.tooltip.date')}: ${formatTimeByGranularity(label)}`
                      }
                    />
                    <Line
                      type='monotone'
                      dataKey='requests'
                      stroke={chartConfig.colors.requests}
                      strokeWidth={chartConfig.lineChart.line.strokeWidth}
                      dot={chartConfig.lineChart.line.dot}
                      activeDot={chartConfig.lineChart.line.activeDot}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                {t('dashboard.charts.quota.title')}
              </Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer
                  width='100%'
                  height={120}
                  margin={{ left: 10, right: 10 }}
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={chartConfig.lineChart.grid.vertical}
                      horizontal={chartConfig.lineChart.grid.horizontal}
                      opacity={chartConfig.lineChart.grid.opacity}
                    />
                    <XAxis {...xAxisConfig} />
                    <YAxis hide={true} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [
                        value.toFixed(6),
                        t('dashboard.charts.quota.tooltip'),
                      ]}
                      labelFormatter={(label) =>
                        `${t('dashboard.statistics.tooltip.date')}: ${formatTimeByGranularity(label)}`
                      }
                    />
                    <Line
                      type='monotone'
                      dataKey='quota'
                      stroke={chartConfig.colors.quota}
                      strokeWidth={chartConfig.lineChart.line.strokeWidth}
                      dot={chartConfig.lineChart.line.dot}
                      activeDot={chartConfig.lineChart.line.activeDot}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                {t('dashboard.charts.tokens.title')}
              </Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer
                  width='100%'
                  height={120}
                  margin={{ left: 10, right: 10 }}
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={chartConfig.lineChart.grid.vertical}
                      horizontal={chartConfig.lineChart.grid.horizontal}
                      opacity={chartConfig.lineChart.grid.opacity}
                    />
                    <XAxis {...xAxisConfig} />
                    <YAxis hide={true} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => [
                        value,
                        t('dashboard.charts.tokens.tooltip'),
                      ]}
                      labelFormatter={(label) =>
                        `${t('dashboard.statistics.tooltip.date')}: ${formatTimeByGranularity(label)}`
                      }
                    />
                    <Line
                      type='monotone'
                      dataKey='tokens'
                      stroke={chartConfig.colors.tokens}
                      strokeWidth={chartConfig.lineChart.line.strokeWidth}
                      dot={chartConfig.lineChart.line.dot}
                      activeDot={chartConfig.lineChart.line.activeDot}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>
      </Grid>

      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header>{t('dashboard.statistics.title')}</Card.Header>
          <div className='chart-container'>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={modelData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  opacity={0.1}
                />
                <XAxis {...xAxisConfig} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#A3AED0' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  labelFormatter={(label) =>
                    `${t('dashboard.statistics.tooltip.date')}: ${formatTimeByGranularity(label)}`
                  }
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px',
                  }}
                />
                {models.map((model, index) => (
                  <Bar
                    key={model}
                    dataKey={model}
                    stackId='a'
                    fill={getColorByIndex(index)}
                    name={model}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card.Content>
      </Card>

      <div className='new-charts-section'>
        <Grid columns={2} stackable className='charts-grid'>
          <Grid.Column>
            <Card fluid className='chart-card'>
              <Card.Content>
                <Card.Header>{t('dashboard.charts.grouped_bar.title')}</Card.Header>
                <div className='chart-container'>
                  <GroupedBarChart
                    data={channelData}
                    xAxisKey='name'
                    dataKeys={['requests', 'quota', 'tokens']}
                    height={280}
                    valueFormatter={(value, name) => {
                      if (name === 'quota') return [`$${value.toFixed(6)}`, name];
                      return [value.toLocaleString(), name];
                    }}
                    emptyMessage={t('dashboard.stats.no_data.title')}
                  />
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>

          <Grid.Column>
            <Card fluid className='chart-card'>
              <Card.Content>
                <Card.Header>{t('dashboard.charts.heatmap.title')}</Card.Header>
                <div className='chart-container'>
                  {heatmapLoading ? (
                    <Loader active size='small' />
                  ) : (
                    <HeatmapChart
                      data={heatmapData}
                      metric='request_count'
                      height={280}
                    />
                  )}
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>

          <Grid.Column>
            <Card fluid className='chart-card'>
              <Card.Content>
                <Card.Header>{t('dashboard.charts.radar.title')}</Card.Header>
                <div className='chart-container'>
                  <RadarChart
                    data={radarData}
                    metrics={Object.keys(radarData[0] || {}).filter(k => k !== 'dimension')}
                    height={280}
                  />
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>

          <Grid.Column>
            <Card fluid className='chart-card'>
              <Card.Content>
                <Card.Header>{t('dashboard.charts.stacked_grouped.title')}</Card.Header>
                <div className='chart-container'>
                  <StackedGroupedBarChart
                    data={stackedGroupedData}
                    groupKey='channel'
                    stackKeys={Object.keys(stackedGroupedData[0] || {}).filter(k => k !== 'channel')}
                    height={280}
                    valueFormatter={(value) => value.toLocaleString()}
                    emptyMessage={t('dashboard.stats.no_data.title')}
                  />
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>
        </Grid>
      </div>
    </div>
  );
};

export default Dashboard;