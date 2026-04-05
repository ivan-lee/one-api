import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Grid, Statistic, Loader, Message } from 'semantic-ui-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
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

const Overview = () => {
  const { t } = useTranslation();
  const { dashboardData, loading, error, granularity } = useDashboard();

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

  if (loading) {
    return (
      <div className='dashboard-loader'>
        <Loader active size='large'>
          {t('dashboard.stats.loading')}
        </Loader>
      </div>
    );
  }

  if (error) {
    return (
      <Message negative>
        <Message.Header>{t('dashboard.stats.error.title')}</Message.Header>
        <p>{error}</p>
      </Message>
    );
  }

  if (!dashboardData || !dashboardData.time_series || dashboardData.time_series.length === 0) {
    return (
      <Message warning>
        <Message.Header>{t('dashboard.stats.no_data.title')}</Message.Header>
        <p>{t('dashboard.stats.no_data.description')}</p>
      </Message>
    );
  }

  const timeSeriesData = dashboardData.time_series.map((item) => ({
    time_slot: item.time_slot,
    requests: item.request_count || 0,
    quota: (item.quota || 0) / 1000000,
    tokens: (item.prompt_tokens || 0) + (item.completion_tokens || 0),
  }));

  const today = new Date().toISOString().split('T')[0];
  const todayData = dashboardData.time_series.filter((item) => {
    const slot = item.time_slot;
    if (granularity === 'day') {
      return slot === today;
    }
    if (granularity === 'hour') {
      return slot.startsWith(today);
    }
    return false;
  });

  const todayMetrics = {
    requests: todayData.reduce((sum, item) => sum + (item.request_count || 0), 0),
    quota: todayData.reduce((sum, item) => sum + (item.quota || 0) / 1000000, 0),
    tokens: todayData.reduce(
      (sum, item) => sum + (item.prompt_tokens || 0) + (item.completion_tokens || 0),
      0
    ),
  };

  const totalRequests = timeSeriesData.reduce((sum, item) => sum + item.requests, 0);
  const totalQuota = timeSeriesData.reduce((sum, item) => sum + item.quota, 0);

  const topChannels = (dashboardData.channels || [])
    .slice(0, 3)
    .map((channel) => ({
      name: channel.channel_name || `Channel #${channel.channel_id}`,
      requests: channel.request_count || 0,
    }));

  const topModels = (dashboardData.models || [])
    .slice(0, 3)
    .map((model) => ({
      name: model.model_name || 'Unknown',
      requests: model.request_count || 0,
    }));

  return (
    <div className='overview-content'>
      <Grid columns={3} className='charts-grid'>
        <Grid.Column>
          <Card fluid className='stat-card'>
            <Card.Content>
              <Statistic>
                <Statistic.Value>{todayMetrics.quota.toFixed(4)}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_quota')}</Statistic.Label>
              </Statistic>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.9 }}>
                今日消费 ($)
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='stat-card'>
            <Card.Content>
              <Statistic>
                <Statistic.Value>{todayMetrics.requests}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_requests')}</Statistic.Label>
              </Statistic>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.9 }}>
                今日请求量
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='stat-card'>
            <Card.Content>
              <Statistic>
                <Statistic.Value>{todayMetrics.tokens}</Statistic.Value>
                <Statistic.Label>{t('dashboard.stats.overview.total_prompt_tokens')}</Statistic.Label>
              </Statistic>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.9 }}>
                今日 Tokens
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>
      </Grid>

      <Grid columns={3} className='charts-grid'>
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

      <Card fluid className='chart-card' style={{ marginTop: '1rem' }}>
        <Card.Content>
          <Card.Header>
            7天统计摘要
          </Card.Header>
          <div style={{ padding: '16px' }}>
            <Grid columns={4} relaxed>
              <Grid.Column>
                <Statistic size='small'>
                  <Statistic.Value>{totalRequests}</Statistic.Value>
                  <Statistic.Label>总请求</Statistic.Label>
                </Statistic>
              </Grid.Column>
              <Grid.Column>
                <Statistic size='small'>
                  <Statistic.Value>${totalQuota.toFixed(4)}</Statistic.Value>
                  <Statistic.Label>总消费</Statistic.Label>
                </Statistic>
              </Grid.Column>
              <Grid.Column>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2B3674' }}>
                    Top 3 渠道
                  </div>
                  {topChannels.map((channel, index) => (
                    <div key={index} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                      {index + 1}. {channel.name} ({channel.requests} 次)
                    </div>
                  ))}
                </div>
              </Grid.Column>
              <Grid.Column>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2B3674' }}>
                    Top 3 模型
                  </div>
                  {topModels.map((model, index) => (
                    <div key={index} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                      {index + 1}. {model.name} ({model.requests} 次)
                    </div>
                  ))}
                </div>
              </Grid.Column>
            </Grid>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Overview;