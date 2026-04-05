import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Grid, Dropdown, Loader, Message, Form } from 'semantic-ui-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API } from '../../../helpers';
import { useDashboard } from '../context/DashboardContext';
import HeatmapChart from '../../../components/charts/HeatmapChart';
import '../../Dashboard/Dashboard.css';

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
};

const TimeAnalysis = () => {
  const { t } = useTranslation();
  const { 
    timeRange, 
    granularity,
    loading: globalLoading,
    error: globalError 
  } = useDashboard();

  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');

  const [channelOptions, setChannelOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);

  const [localHeatmapData, setLocalHeatmapData] = useState(null);
  const [localTimeSeriesData, setLocalTimeSeriesData] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [heatmapApiAvailable, setHeatmapApiAvailable] = useState(true);

  const fetchChannelOptions = useCallback(async () => {
    try {
      const res = await API.get('/api/stats/channels', {
        params: {
          start_timestamp: timeRange.startTimestamp,
          end_timestamp: timeRange.endTimestamp,
        }
      });
      
      const { success, data } = res.data;
      if (success && data) {
        const options = data.slice(0, 50).map((channel) => ({
          key: channel.channel_id,
          text: channel.channel_name || `Channel #${channel.channel_id}`,
          value: channel.channel_id.toString(),
        }));
        options.unshift({
          key: 'all',
          text: t('dashboard.filters.all_channels') || '全部渠道',
          value: 'all',
        });
        setChannelOptions(options);
      }
    } catch (err) {
      console.error('Failed to fetch channel options:', err);
      setChannelOptions([
        { key: 'all', text: t('dashboard.filters.all_channels') || '全部渠道', value: 'all' }
      ]);
    }
  }, [timeRange, t]);

  const fetchModelOptions = useCallback(async () => {
    try {
      const res = await API.get('/api/stats/models', {
        params: {
          start_timestamp: timeRange.startTimestamp,
          end_timestamp: timeRange.endTimestamp,
          num: 50
        }
      });
      
      const { success, data } = res.data;
      if (success && data) {
        const options = data.map((model) => ({
          key: model.model_name,
          text: model.model_name || 'Unknown',
          value: model.model_name,
        }));
        options.unshift({
          key: 'all',
          text: t('dashboard.filters.all_models') || '全部模型',
          value: 'all',
        });
        setModelOptions(options);
      }
    } catch (err) {
      console.error('Failed to fetch model options:', err);
      setModelOptions([
        { key: 'all', text: t('dashboard.filters.all_models') || '全部模型', value: 'all' }
      ]);
    }
  }, [timeRange, t]);

  const fetchHeatmapData = useCallback(async () => {
    setLocalLoading(true);
    setLocalError(null);
    
    try {
      const params = {
        start_timestamp: timeRange.startTimestamp,
        end_timestamp: timeRange.endTimestamp,
      };
      
      if (selectedChannel !== 'all') {
        params.channel_id = selectedChannel;
      }
      if (selectedModel !== 'all') {
        params.model_name = selectedModel;
      }
      
      const response = await API.get(`/api/stats/heatmap`, { params });
      
      if (response.data.success) {
        setLocalHeatmapData(response.data.data || []);
        setHeatmapApiAvailable(true);
      } else {
        setLocalHeatmapData(null);
        setHeatmapApiAvailable(false);
      }
    } catch (err) {
      console.error('Failed to fetch heatmap data:', err);
      setLocalHeatmapData(null);
      setHeatmapApiAvailable(false);
    }
    
    setLocalLoading(false);
  }, [timeRange, selectedChannel, selectedModel]);

  const fetchTimeSeriesData = useCallback(async () => {
    setLocalLoading(true);
    
    try {
      const params = {
        start_timestamp: timeRange.startTimestamp,
        end_timestamp: timeRange.endTimestamp,
        granularity,
      };
      
      if (selectedChannel !== 'all') {
        params.channel_id = selectedChannel;
      }
      if (selectedModel !== 'all') {
        params.model_name = selectedModel;
      }
      
      const response = await API.get('/api/user/dashboard', { params });
      
      if (response.data.success) {
        const data = response.data.data || [];
        const timeSeries = data.map((item) => ({
          time_slot: item.time_slot,
          requests: item.request_count || 0,
          quota: (item.quota || 0) / 1000000,
          tokens: (item.prompt_tokens || 0) + (item.completion_tokens || 0),
        }));
        setLocalTimeSeriesData(timeSeries);
      } else {
        setLocalTimeSeriesData([]);
      }
    } catch (err) {
      console.error('Failed to fetch time series data:', err);
      setLocalTimeSeriesData([]);
    }
    
    setLocalLoading(false);
  }, [timeRange, granularity, selectedChannel, selectedModel]);

  useEffect(() => {
    if (timeRange.startTimestamp && timeRange.endTimestamp) {
      fetchChannelOptions();
      fetchModelOptions();
    }
  }, [timeRange, fetchChannelOptions, fetchModelOptions]);

  useEffect(() => {
    if (timeRange.startTimestamp && timeRange.endTimestamp) {
      fetchHeatmapData();
      fetchTimeSeriesData();
    }
  }, [timeRange, granularity, selectedChannel, selectedModel, fetchHeatmapData, fetchTimeSeriesData]);

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
          month: 'short',
          day: 'numeric',
        });
      case 'week':
        return timeSlot;
      case 'month':
        const monthDate = new Date(timeSlot);
        return monthDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
        });
      default:
        return timeSlot;
    }
  };

  const xAxisConfig = {
    dataKey: 'time_slot',
    tick: { fontSize: 12, fill: '#A3AED0' },
    axisLine: false,
    tickLine: false,
    tickFormatter: formatTimeByGranularity,
  };

  const handleChannelChange = (e, { value }) => {
    setSelectedChannel(value);
  };

  const handleModelChange = (e, { value }) => {
    setSelectedModel(value);
  };

  const isLoading = globalLoading || localLoading;
  const hasError = globalError || localError;

  if (isLoading) {
    return (
      <div className='dashboard-loader'>
        <Loader active size='large'>
          {t('dashboard.stats.loading') || '加载中...'}
        </Loader>
      </div>
    );
  }

  if (hasError) {
    return (
      <Message negative>
        <Message.Header>{t('dashboard.stats.error.title') || '错误'}</Message.Header>
        <p>{hasError}</p>
      </Message>
    );
  }

  return (
    <div className='time-analysis-content'>
      <Card fluid className='filter-card' style={{ marginBottom: '1rem' }}>
        <Card.Content>
          <Form>
            <Grid columns={2}>
              <Grid.Column>
                <Form.Field>
                  <label>{t('dashboard.filters.channel') || '渠道筛选'}</label>
                  <Dropdown
                    selection
                    clearable
                    search
                    options={channelOptions}
                    value={selectedChannel}
                    placeholder={t('dashboard.filters.select_channel') || '选择渠道'}
                    onChange={handleChannelChange}
                    noResultsMessage={t('dashboard.filters.no_results') || '无结果'}
                  />
                </Form.Field>
              </Grid.Column>
              <Grid.Column>
                <Form.Field>
                  <label>{t('dashboard.filters.model') || '模型筛选'}</label>
                  <Dropdown
                    selection
                    clearable
                    search
                    options={modelOptions}
                    value={selectedModel}
                    placeholder={t('dashboard.filters.select_model') || '选择模型'}
                    onChange={handleModelChange}
                    noResultsMessage={t('dashboard.filters.no_results') || '无结果'}
                  />
                </Form.Field>
              </Grid.Column>
            </Grid>
          </Form>
        </Card.Content>
      </Card>

      <Card fluid className='chart-card' style={{ marginBottom: '1rem' }}>
        <Card.Content>
          <Card.Header>
            {t('dashboard.charts.heatmap.title') || '时段热力图'}
          </Card.Header>
          <div style={{ marginTop: '16px' }}>
            {!heatmapApiAvailable ? (
              <Message warning>
                <Message.Header>
                  {t('dashboard.charts.heatmap.api_unavailable') || 'API未可用'}
                </Message.Header>
                <p>
                  {t('dashboard.charts.heatmap.api_unavailable_desc') || 
                    '热力图数据暂时无法获取，请稍后再试'}
                </p>
              </Message>
            ) : localHeatmapData && localHeatmapData.length > 0 ? (
              <HeatmapChart 
                data={localHeatmapData} 
                metric='request_count' 
                height={300}
              />
            ) : (
              <Message info>
                <Message.Header>
                  {t('dashboard.stats.no_data.title') || '无数据'}
                </Message.Header>
                <p>
                  {t('dashboard.charts.heatmap.no_data_desc') || 
                    '当前筛选条件下没有热力图数据'}
                </p>
              </Message>
            )}
          </div>
        </Card.Content>
      </Card>

      {localTimeSeriesData.length === 0 ? (
        <Message info>
          <Message.Header>
            {t('dashboard.stats.no_data.title') || '无数据'}
          </Message.Header>
          <p>
            {t('dashboard.stats.no_data.description') || 
              '当前筛选条件下没有趋势数据'}
          </p>
        </Message>
      ) : (
        <Grid columns={3} className='charts-grid'>
          <Grid.Column>
            <Card fluid className='chart-card'>
              <Card.Content>
                <Card.Header>
                  {t('dashboard.charts.requests.title') || '请求量'}
                </Card.Header>
                <div className='chart-container'>
                  <ResponsiveContainer
                    width='100%'
                    height={120}
                    margin={{ left: 10, right: 10 }}
                  >
                    <LineChart data={localTimeSeriesData}>
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
                          t('dashboard.charts.requests.tooltip') || '请求量',
                        ]}
                        labelFormatter={(label) =>
                          `${t('dashboard.statistics.tooltip.date') || '时间'}: ${formatTimeByGranularity(label)}`
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
                  {t('dashboard.charts.quota.title') || '消费'}
                </Card.Header>
                <div className='chart-container'>
                  <ResponsiveContainer
                    width='100%'
                    height={120}
                    margin={{ left: 10, right: 10 }}
                  >
                    <LineChart data={localTimeSeriesData}>
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
                          t('dashboard.charts.quota.tooltip') || '消费',
                        ]}
                        labelFormatter={(label) =>
                          `${t('dashboard.statistics.tooltip.date') || '时间'}: ${formatTimeByGranularity(label)}`
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
                  {t('dashboard.charts.tokens.title') || 'Tokens'}
                </Card.Header>
                <div className='chart-container'>
                  <ResponsiveContainer
                    width='100%'
                    height={120}
                    margin={{ left: 10, right: 10 }}
                  >
                    <LineChart data={localTimeSeriesData}>
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
                          t('dashboard.charts.tokens.tooltip') || 'Tokens',
                        ]}
                        labelFormatter={(label) =>
                          `${t('dashboard.statistics.tooltip.date') || '时间'}: ${formatTimeByGranularity(label)}`
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
      )}
    </div>
  );
};

export default TimeAnalysis;