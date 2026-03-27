import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Dropdown,
  Grid,
  Header,
  Loader,
  Message,
  Statistic,
} from 'semantic-ui-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API, showError } from '../../helpers';
import { renderQuota } from '../../helpers/render';
import './TokenStats.css';

const COLORS = [
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

const TokenStats = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('7d');
  const [overallStats, setOverallStats] = useState({
    total_requests: 0,
    total_quota: 0,
    total_tokens: 0,
  });
  const [dailyStats, setDailyStats] = useState([]);
  const [hourlyStats, setHourlyStats] = useState([]);
  const [modelStats, setModelStats] = useState([]);

  const dateRangeOptions = [
    { key: '7d', text: t('token.stats.date_range.7d'), value: '7d' },
    { key: '14d', text: t('token.stats.date_range.14d'), value: '14d' },
    { key: '30d', text: t('token.stats.date_range.30d'), value: '30d' },
    { key: '90d', text: t('token.stats.date_range.90d'), value: '90d' },
  ];

  useEffect(() => {
    fetchAllStats();
  }, [id, dateRange]);

  const fetchAllStats = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchOverallStats(),
        fetchDailyStats(),
        fetchHourlyStats(),
        fetchModelStats(),
      ]);
    } catch (err) {
      setError(t('token.stats.error.load_failed'));
      showError(err);
    }
    setLoading(false);
  };

  const fetchOverallStats = async () => {
    try {
      const res = await API.get(`/api/token/${id}/stats`);
      const { success, data, message } = res.data;
      if (success && data) {
        setOverallStats({
          total_requests: data.total_requests || 0,
          total_quota: data.total_quota || 0,
          total_tokens: data.total_tokens || 0,
        });
      } else {
        throw new Error(message || 'Failed to load overall stats');
      }
    } catch (err) {
      console.error('Failed to fetch overall stats:', err);
      setOverallStats({ total_requests: 0, total_quota: 0, total_tokens: 0 });
    }
  };

  const fetchDailyStats = async () => {
    try {
      const res = await API.get(`/api/token/${id}/stats/daily?range=${dateRange}`);
      const { success, data, message } = res.data;
      if (success && data) {
        setDailyStats(data);
      } else {
        throw new Error(message || 'Failed to load daily stats');
      }
    } catch (err) {
      console.error('Failed to fetch daily stats:', err);
      setDailyStats([]);
    }
  };

  const fetchHourlyStats = async () => {
    try {
      const res = await API.get(`/api/token/${id}/stats/hourly`);
      const { success, data, message } = res.data;
      if (success && data) {
        setHourlyStats(data);
      } else {
        throw new Error(message || 'Failed to load hourly stats');
      }
    } catch (err) {
      console.error('Failed to fetch hourly stats:', err);
      setHourlyStats([]);
    }
  };

  const fetchModelStats = async () => {
    try {
      const res = await API.get(`/api/token/${id}/stats/model?range=${dateRange}`);
      const { success, data, message } = res.data;
      if (success && data) {
        setModelStats(data);
      } else {
        throw new Error(message || 'Failed to load model stats');
      }
    } catch (err) {
      console.error('Failed to fetch model stats:', err);
      setModelStats([]);
    }
  };

  const handleDateRangeChange = (e, { value }) => {
    setDateRange(value);
  };

  const handleRefresh = () => {
    fetchAllStats();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  const formatHour = (hour) => {
    return `${hour}:00`;
  };

  const processDailyData = () => {
    if (!dailyStats || dailyStats.length === 0) return [];

    return dailyStats.map((item) => ({
      date: item.day || item.Date,
      requests: item.request_count || item.RequestCount || 0,
      quota: (item.quota || item.Quota || 0) / 1000000,
      tokens: item.prompt_tokens + item.completion_tokens ||
        item.PromptTokens + item.CompletionTokens || 0,
    }));
  };

  const processHourlyData = () => {
    if (!hourlyStats || hourlyStats.length === 0) return [];

    return hourlyStats.map((item) => ({
      hour: item.hour || item.Hour,
      requests: item.request_count || item.RequestCount || 0,
      quota: (item.quota || item.Quota || 0) / 1000000,
    }));
  };

  const processModelData = () => {
    if (!modelStats || modelStats.length === 0) return [];

    return modelStats.map((item, index) => ({
      name: item.model_name || item.ModelName || 'Unknown',
      value: item.request_count || item.RequestCount || 0,
      tokens: item.prompt_tokens + item.completion_tokens ||
        item.PromptTokens + item.CompletionTokens || 0,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const xAxisConfig = {
    dataKey: 'date',
    axisLine: false,
    tickLine: false,
    tick: {
      fontSize: 12,
      fill: '#A3AED0',
      textAnchor: 'middle',
    },
    tickFormatter: formatDate,
    interval: 0,
    minTickGap: 5,
    padding: { left: 30, right: 30 },
  };

  const hourlyXAxisConfig = {
    dataKey: 'hour',
    axisLine: false,
    tickLine: false,
    tick: {
      fontSize: 12,
      fill: '#A3AED0',
      textAnchor: 'middle',
    },
    tickFormatter: formatHour,
    interval: 2,
    minTickGap: 5,
    padding: { left: 30, right: 30 },
  };

  const isEmptyData = () => {
    return (
      overallStats.total_requests === 0 &&
      dailyStats.length === 0 &&
      hourlyStats.length === 0 &&
      modelStats.length === 0
    );
  };

  if (loading) {
    return (
      <div className='token-stats-loading'>
        <Loader active size='large'>{t('token.stats.loading')}</Loader>
      </div>
    );
  }

  if (error) {
    return (
      <div className='token-stats-error'>
        <Message negative>
          <Message.Header>{t('token.stats.error.title')}</Message.Header>
          <p>{error}</p>
          <Button onClick={handleRefresh}>{t('token.stats.buttons.retry')}</Button>
        </Message>
      </div>
    );
  }

  return (
    <div className='token-stats-container'>
      <Card fluid className='stats-header-card'>
        <Card.Content>
          <div className='stats-header'>
            <Header as='h2'>{t('token.stats.title')}</Header>
            <div className='stats-controls'>
              <Dropdown
                selection
                options={dateRangeOptions}
                value={dateRange}
                onChange={handleDateRangeChange}
                className='date-range-dropdown'
              />
              <Button primary onClick={handleRefresh} loading={loading}>
                {t('token.stats.buttons.refresh')}
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {isEmptyData() && (
        <Message info>
          <Message.Header>{t('token.stats.no_data.title')}</Message.Header>
          <p>{t('token.stats.no_data.description')}</p>
        </Message>
      )}

      <Card fluid className='stats-overview-card'>
        <Card.Content>
          <Card.Header>{t('token.stats.overview.title')}</Card.Header>
          <Grid columns={3} stackable className='stats-grid'>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overallStats.total_requests.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('token.stats.overview.total_requests')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{renderQuota(overallStats.total_quota, t)}</Statistic.Value>
                <Statistic.Label>{t('token.stats.overview.total_quota')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overallStats.total_tokens.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('token.stats.overview.total_tokens')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
          </Grid>
        </Card.Content>
      </Card>

      <Grid columns={3} stackable className='charts-grid'>
        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>{t('token.stats.charts.daily_requests')}</Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer width='100%' height={150}>
                  <LineChart data={processDailyData()}>
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
                      formatter={(value) => [value, t('token.stats.charts.requests_tooltip')]}
                      labelFormatter={(label) => `${t('token.stats.date_label')}: ${formatDate(label)}`}
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
              <Card.Header>{t('token.stats.charts.daily_quota')}</Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer width='100%' height={150}>
                  <LineChart data={processDailyData()}>
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
                      formatter={(value) => [value.toFixed(6), t('token.stats.charts.quota_tooltip')]}
                      labelFormatter={(label) => `${t('token.stats.date_label')}: ${formatDate(label)}`}
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
              <Card.Header>{t('token.stats.charts.daily_tokens')}</Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer width='100%' height={150}>
                  <LineChart data={processDailyData()}>
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
                      formatter={(value) => [value, t('token.stats.charts.tokens_tooltip')]}
                      labelFormatter={(label) => `${t('token.stats.date_label')}: ${formatDate(label)}`}
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
          <Card.Header>{t('token.stats.charts.hourly_usage')}</Card.Header>
          <div className='chart-container'>
            <ResponsiveContainer width='100%' height={250}>
              <BarChart data={processHourlyData()}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} opacity={0.1} />
                <XAxis {...hourlyXAxisConfig} />
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
                  labelFormatter={(label) => `${t('token.stats.hour_label')}: ${formatHour(label)}`}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey='requests'
                  fill={chartConfig.colors.requests}
                  name={t('token.stats.charts.requests_tooltip')}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card.Content>
      </Card>

      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header>{t('token.stats.charts.model_usage')}</Card.Header>
          <div className='chart-container'>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={processModelData()}
                  cx='50%'
                  cy='50%'
                  labelLine={true}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  dataKey='value'
                >
                  {processModelData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value, name) => [
                    `${t('token.stats.charts.requests_tooltip')}: ${value}`,
                    name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default TokenStats;