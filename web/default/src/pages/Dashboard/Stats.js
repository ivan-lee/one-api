import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API, showError } from '../../helpers';
import { renderQuota } from '../../helpers/render';
import { isAdmin } from '../../helpers/utils';
import DatePickerWithPresets from '../../components/DatePickerWithPresets';
import DimensionFilter from '../../components/DimensionFilter';
import GranularitySelector from '../../components/GranularitySelector';
import ExportButton from '../../components/ExportButton';
import '../../components/DimensionFilter.css';
import './Stats.css';

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
  colors: {
    requests: '#4318FF',
    quota: '#00B5D8',
    tokens: '#6C63FF',
    users: '#05CD99',
    channels: '#FFB547',
  },
};

const Stats = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAdminUser = isAdmin();

  const [timeRange, setTimeRange] = useState({
    startTimestamp: 0,
    endTimestamp: Math.floor(Date.now() / 1000),
    preset: '7d',
  });
  const [granularity, setGranularity] = useState('day');
  const [dimensionFilters, setDimensionFilters] = useState({});
  const [overviewStats, setOverviewStats] = useState({
    total_users: 0,
    total_tokens: 0,
    total_channels: 0,
    total_requests: 0,
    total_quota: 0,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
  });

  const [modelStats, setModelStats] = useState([]);
  const [userRanking, setUserRanking] = useState([]);
  const [tokenRanking, setTokenRanking] = useState([]);

  useEffect(() => {
    fetchAllStats();
  }, [timeRange, granularity, dimensionFilters]);

  const buildApiParams = useCallback(() => {
    const params = {
      start_timestamp: timeRange.startTimestamp,
      end_timestamp: timeRange.endTimestamp,
      granularity,
    };
    
    if (dimensionFilters.channel && dimensionFilters.channel !== 'all') {
      params.channel_id = dimensionFilters.channel;
    }
    if (dimensionFilters.user_group && dimensionFilters.user_group !== 'all') {
      params.user_group = dimensionFilters.user_group;
    }
    if (dimensionFilters.channel_group && dimensionFilters.channel_group !== 'all') {
      params.channel_group = dimensionFilters.channel_group;
    }
    if (dimensionFilters.model && dimensionFilters.model !== 'all') {
      params.model = dimensionFilters.model;
    }
    
    return params;
  }, [timeRange, granularity, dimensionFilters]);

  const fetchAllStats = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchOverviewStats(),
        fetchModelStats(),
        fetchUserRanking(),
        fetchTokenRanking(),
      ]);
    } catch (err) {
      setError(t('dashboard.stats.error.load_failed'));
      showError(err);
    }
    setLoading(false);
  };

  const fetchOverviewStats = async () => {
    try {
      const params = buildApiParams();
      const res = await API.get('/api/stats/overview', { params });
      const { success, data, message } = res.data;
      if (success && data) {
        setOverviewStats({
          total_users: data.total_users || 0,
          total_tokens: data.total_tokens || 0,
          total_channels: data.total_channels || 0,
          total_requests: data.total_requests || 0,
          total_quota: data.total_quota || 0,
          total_prompt_tokens: data.total_prompt_tokens || 0,
          total_completion_tokens: data.total_completion_tokens || 0,
        });
      } else {
        throw new Error(message || 'Failed to load overview stats');
      }
    } catch (err) {
      console.error('Failed to fetch overview stats:', err);
    }
  };

  const fetchModelStats = async () => {
    try {
      const params = buildApiParams();
      params.num = 10;
      const res = await API.get('/api/stats/models', { params });
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

  const fetchUserRanking = async () => {
    try {
      const params = buildApiParams();
      params.type = 'user';
      params.order_by = 'quota';
      params.limit = 10;
      const res = await API.get('/api/stats/ranking', { params });
      const { success, data, message } = res.data;
      if (success && data) {
        setUserRanking(data);
      } else {
        throw new Error(message || 'Failed to load user ranking');
      }
    } catch (err) {
      console.error('Failed to fetch user ranking:', err);
      setUserRanking([]);
    }
  };

  const fetchTokenRanking = async () => {
    try {
      const params = buildApiParams();
      params.type = 'token';
      params.order_by = 'quota';
      params.limit = 10;
      const res = await API.get('/api/stats/ranking', { params });
      const { success, data, message } = res.data;
      if (success && data) {
        setTokenRanking(data);
      } else {
        throw new Error(message || 'Failed to load token ranking');
      }
    } catch (err) {
      console.error('Failed to fetch token ranking:', err);
      setTokenRanking([]);
    }
  };

  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };

  const handleGranularityChange = (newGranularity) => {
    setGranularity(newGranularity);
  };

  const handleDimensionFilterChange = (activeFilters, allFilters) => {
    setDimensionFilters(allFilters);
  };

  const handleRefresh = () => {
    fetchAllStats();
  };

  const processModelData = () => {
    if (!modelStats || modelStats.length === 0) return [];

    return modelStats.map((item, index) => ({
      name: item.model_name || 'Unknown',
      requests: item.request_count || 0,
      tokens: (item.prompt_tokens || 0) + (item.completion_tokens || 0),
      quota: (item.quota || 0) / 1000000,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const processUserRankingData = () => {
    if (!userRanking || userRanking.length === 0) return [];

    return userRanking.map((item, index) => ({
      name: item.username || `User ${item.user_id}`,
      requests: item.request_count || 0,
      tokens: (item.prompt_tokens || 0) + (item.completion_tokens || 0),
      quota: (item.quota || 0) / 1000000,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const processTokenRankingData = () => {
    if (!tokenRanking || tokenRanking.length === 0) return [];

    return tokenRanking.map((item, index) => ({
      name: item.token_name || 'Unknown',
      requests: item.request_count || 0,
      tokens: (item.prompt_tokens || 0) + (item.completion_tokens || 0),
      quota: (item.quota || 0) / 1000000,
      fill: COLORS[index % COLORS.length],
    }));
  };

  const isEmptyData = () => {
    return (
      overviewStats.total_requests === 0 &&
      modelStats.length === 0 &&
      userRanking.length === 0 &&
      tokenRanking.length === 0
    );
  };

  const getEnabledDimensions = () => {
    if (isAdminUser) {
      return ['channel', 'user_group', 'channel_group', 'model'];
    }
    return ['model'];
  };

  const getExportFilters = () => {
    return {
      startTimestamp: timeRange.startTimestamp,
      endTimestamp: timeRange.endTimestamp,
      granularity,
      channelId: dimensionFilters.channel !== 'all' ? dimensionFilters.channel : null,
      userGroup: dimensionFilters.user_group !== 'all' ? dimensionFilters.user_group : null,
      channelGroup: dimensionFilters.channel_group !== 'all' ? dimensionFilters.channel_group : null,
      model: dimensionFilters.model !== 'all' ? dimensionFilters.model : null,
    };
  };

  if (loading && modelStats.length === 0) {
    return (
      <div className='stats-loading'>
        <Loader active size='large'>{t('dashboard.stats.loading')}</Loader>
      </div>
    );
  }

  if (error) {
    return (
      <div className='stats-error'>
        <Message negative>
          <Message.Header>{t('dashboard.stats.error.title')}</Message.Header>
          <p>{error}</p>
          <Button onClick={handleRefresh}>{t('dashboard.stats.buttons.retry')}</Button>
        </Message>
      </div>
    );
  }

  return (
    <div className='stats-container'>
      <Card fluid className='stats-header-card'>
        <Card.Content>
          <div className='stats-header'>
            <Header as='h2'>{t('dashboard.stats.title')}</Header>
            <div className='stats-controls'>
              <DatePickerWithPresets
                onChange={handleTimeRangeChange}
                defaultPreset='7d'
              />
              <GranularitySelector
                value={granularity}
                onChange={handleGranularityChange}
              />
              <ExportButton filters={getExportFilters()} />
              <Button primary onClick={handleRefresh} loading={loading}>
                {t('dashboard.stats.buttons.refresh')}
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card fluid className='stats-filter-card'>
        <Card.Content>
          <Card.Header>{t('dashboard.stats.filters.title') || '数据筛选'}</Card.Header>
          <DimensionFilter
            dimensions={getEnabledDimensions()}
            onChange={handleDimensionFilterChange}
            timeRange={timeRange}
          />
        </Card.Content>
      </Card>

      {isEmptyData() && (
        <Message info>
          <Message.Header>{t('dashboard.stats.no_data.title')}</Message.Header>
          <p>{t('dashboard.stats.no_data.description')}</p>
        </Message>
      )}

      <Card fluid className='stats-overview-card'>
        <Card.Content>
          <Card.Header>{t('dashboard.stats.overview.title')}</Card.Header>
          <Grid columns={4} stackable className='stats-grid'>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overviewStats.total_users.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_users')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overviewStats.total_channels.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_channels')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overviewStats.total_tokens.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_api_tokens')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overviewStats.total_requests.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_requests')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
          </Grid>
          <Grid columns={3} stackable className='stats-grid'>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{renderQuota(overviewStats.total_quota, t)}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_quota')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overviewStats.total_prompt_tokens.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_prompt_tokens')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
            <Grid.Column>
              <Statistic>
                <Statistic.Value>{overviewStats.total_completion_tokens.toLocaleString()}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_completion_tokens')}</Statistic.Label>
              </Statistic>
            </Grid.Column>
          </Grid>
        </Card.Content>
      </Card>

      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header>{t('dashboard.stats.charts.model_usage')}</Card.Header>
          <div className='chart-container'>
            <ResponsiveContainer width='100%' height={350}>
              <PieChart>
                <Pie
                  data={processModelData()}
                  cx='50%'
                  cy='50%'
                  labelLine={true}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={120}
                  dataKey='requests'
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
                  formatter={(value, name, props) => [
                    `${t('dashboard.stats.charts.requests_tooltip')}: ${value}`,
                    props.payload.name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card.Content>
      </Card>

      <Grid columns={2} stackable className='charts-grid'>
        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>{t('dashboard.stats.charts.user_ranking')}</Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart
                    data={processUserRankingData()}
                    layout='vertical'
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' horizontal={true} vertical={false} />
                    <XAxis
                      type='number'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#A3AED0' }}
                    />
                    <YAxis
                      dataKey='name'
                      type='category'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#A3AED0' }}
                      width={75}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value, name) => {
                        if (name === 'quota') {
                          return [value.toFixed(6), t('dashboard.stats.charts.quota_tooltip')];
                        }
                        return [value, t(`dashboard.stats.charts.${name}_tooltip`)];
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey='quota'
                      fill={chartConfig.colors.quota}
                      name={t('dashboard.stats.charts.quota_tooltip')}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>{t('dashboard.stats.charts.token_ranking')}</Card.Header>
              <div className='chart-container'>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart
                    data={processTokenRankingData()}
                    layout='vertical'
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray='3 3' horizontal={true} vertical={false} />
                    <XAxis
                      type='number'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#A3AED0' }}
                    />
                    <YAxis
                      dataKey='name'
                      type='category'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#A3AED0' }}
                      width={75}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value, name) => {
                        if (name === 'quota') {
                          return [value.toFixed(6), t('dashboard.stats.charts.quota_tooltip')];
                        }
                        return [value, t(`dashboard.stats.charts.${name}_tooltip`)];
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey='quota'
                      fill={chartConfig.colors.requests}
                      name={t('dashboard.stats.charts.quota_tooltip')}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>
      </Grid>
    </div>
  );
};

export default Stats;