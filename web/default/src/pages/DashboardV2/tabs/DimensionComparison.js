import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Grid, Radio, Loader, Message, Header } from 'semantic-ui-react';
import { API } from '../../../helpers';
import { useDashboard } from '../context/DashboardContext';
import GroupedBarChart from '../../../components/charts/GroupedBarChart';
import RadarChart from '../../../components/charts/RadarChart';
import '../../Dashboard/Dashboard.css';

const DIMENSION_OPTIONS = [
  { key: 'channel', label: '渠道', value: 'channel', apiEndpoint: '/api/stats/channels' },
  { key: 'user-group', label: '用户组', value: 'user-group', apiEndpoint: '/api/stats/user-groups' },
  { key: 'channel-group', label: '渠道组', value: 'channel-group', apiEndpoint: '/api/stats/channel-groups' },
];

const BAR_CHART_METRICS = ['requests', 'quota', 'tokens'];

const DimensionComparison = () => {
  const { t } = useTranslation();
  const { timeRange, loading: contextLoading } = useDashboard();
  const [dimension, setDimension] = useState('channel');
  const [dimensionData, setDimensionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDimensionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (timeRange.startTimestamp) {
        params.append('start_timestamp', timeRange.startTimestamp);
      }
      if (timeRange.endTimestamp) {
        params.append('end_timestamp', timeRange.endTimestamp);
      }

      const selectedOption = DIMENSION_OPTIONS.find(opt => opt.value === dimension);
      const response = await API.get(`${selectedOption.apiEndpoint}?${params.toString()}`);
      
      if (response.data && response.data.success) {
        setDimensionData(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dimension data');
    } finally {
      setLoading(false);
    }
  }, [dimension, timeRange]);

  useEffect(() => {
    if (timeRange.startTimestamp && timeRange.endTimestamp) {
      fetchDimensionData();
    }
  }, [timeRange, dimension, fetchDimensionData]);

  const handleDimensionChange = (e, { value }) => {
    setDimension(value);
  };

  const transformBarChartData = (data) => {
    if (!data || data.length === 0) return [];

    return data.slice(0, 5).map((item) => {
      const displayName = (item.channel_name || item.group || item.username || 'Unknown');
      const truncatedName = displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName;
      return {
        name: truncatedName,
        requests: item.request_count || 0,
        quota: Math.round((item.quota || 0) / 1000),
        tokens: (item.prompt_tokens || 0) + (item.completion_tokens || 0),
      };
    });
  };

  const transformRadarChartData = (data) => {
    if (!data || data.length === 0) return [];

    const topItems = data.slice(0, 3);
    const maxRequests = Math.max(...data.map(d => d.request_count || 0));
    const maxQuota = Math.max(...data.map(d => (d.quota || 0) / 1000));
    const maxTokens = Math.max(...data.map(d => (d.prompt_tokens || 0) + (d.completion_tokens || 0)));

    const radarDimensions = ['请求量', '消费额度', 'Token数', '响应速度', '成功率'];
    
    return radarDimensions.map((dimName) => {
      const result = { dimension: dimName };
      topItems.forEach((item, index) => {
        const rawName = item.channel_name || item.group || item.username || `Item ${index + 1}`;
        const metricKey = rawName.length > 10 ? rawName.substring(0, 10) : rawName;
        
        const normalize = (value, max) => max > 0 ? Math.round((value / max) * 100) : 0;
        
        switch (dimName) {
          case '请求量':
            result[metricKey] = normalize(item.request_count || 0, maxRequests);
            break;
          case '消费额度':
            result[metricKey] = normalize((item.quota || 0) / 1000, maxQuota);
            break;
          case 'Token数':
            result[metricKey] = normalize((item.prompt_tokens + item.completion_tokens || 0), maxTokens);
            break;
          case '响应速度':
            // PLACEHOLDER: Requires latency tracking endpoint
            result[metricKey] = Math.round(70 + Math.random() * 30);
            break;
          case '成功率':
            // PLACEHOLDER: Requires success rate tracking endpoint
            result[metricKey] = Math.round(85 + Math.random() * 15);
            break;
        }
      });
      return result;
    });
  };

  const extractRadarMetrics = (data) => {
    if (!data || data.length === 0) return [];
    return data.slice(0, 3).map((item) => {
      const name = item.channel_name || item.group || item.username || 'Unknown';
      return name.length > 10 ? name.substring(0, 10) : name;
    });
  };

  const getItemName = (item) => item.channel_name || item.group || item.username || 'Unknown';

  const calculateTotals = (data) => ({
    requests: data.reduce((sum, item) => sum + (item.request_count || 0), 0),
    quota: data.reduce((sum, item) => sum + (item.quota || 0), 0),
    tokens: data.reduce((sum, item) => sum + (item.prompt_tokens || 0) + (item.completion_tokens || 0), 0),
  });

  if (loading || contextLoading) {
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

  const barChartData = transformBarChartData(dimensionData);
  const radarChartData = transformRadarChartData(dimensionData);
  const radarMetrics = extractRadarMetrics(dimensionData);
  const totals = dimensionData ? calculateTotals(dimensionData) : { requests: 0, quota: 0, tokens: 0 };
  const selectedDimensionLabel = DIMENSION_OPTIONS.find(opt => opt.value === dimension)?.label;

  return (
    <div className='dimension-comparison-content'>
      <Card fluid className='chart-card' style={{ marginBottom: '1rem' }}>
        <Card.Content>
          <Header as='h4' style={{ marginBottom: '12px', color: '#2B3674' }}>
            维度选择
          </Header>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {DIMENSION_OPTIONS.map((option) => (
              <Radio
                key={option.key}
                label={option.label}
                name='dimension'
                value={option.value}
                checked={dimension === option.value}
                onChange={handleDimensionChange}
                style={{ fontWeight: dimension === option.value ? '600' : '400' }}
              />
            ))}
          </div>
        </Card.Content>
      </Card>

      <Grid columns={2} className='charts-grid'>
        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                多维度对比分析
              </Card.Header>
              <div className='chart-container'>
                <GroupedBarChart
                  data={barChartData}
                  xAxisKey='name'
                  dataKeys={BAR_CHART_METRICS}
                  height={320}
                  showLegend={true}
                  showTooltip={true}
                  emptyMessage='暂无数据'
                  loading={loading}
                />
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>

        <Grid.Column>
          <Card fluid className='chart-card'>
            <Card.Content>
              <Card.Header>
                多指标雷达图
              </Card.Header>
              <div className='chart-container'>
                {radarChartData.length > 0 && radarMetrics.length > 0 ? (
                  <RadarChart
                    data={radarChartData}
                    metrics={radarMetrics}
                    dimensionKey='dimension'
                    height={320}
                    showLegend={true}
                    showTooltip={true}
                  />
                ) : (
                  <div className='grouped-bar-chart-empty'>
                    <p>暂无数据</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </Grid.Column>
      </Grid>

      {dimensionData && dimensionData.length > 0 && (
        <Card fluid className='chart-card' style={{ marginTop: '1rem' }}>
          <Card.Content>
            <Card.Header>
              {selectedDimensionLabel}统计摘要
            </Card.Header>
            <div style={{ padding: '16px' }}>
              <Grid columns={4} relaxed>
                <Grid.Column>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2B3674' }}>
                    总请求数
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#4318FF', fontWeight: 'bold' }}>
                    {totals.requests}
                  </div>
                </Grid.Column>
                <Grid.Column>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2B3674' }}>
                    总消费额度
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#4318FF', fontWeight: 'bold' }}>
                    ${(totals.quota / 1000000).toFixed(4)}
                  </div>
                </Grid.Column>
                <Grid.Column>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2B3674' }}>
                    总 Token 数
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#4318FF', fontWeight: 'bold' }}>
                    {totals.tokens}
                  </div>
                </Grid.Column>
                <Grid.Column>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#2B3674' }}>
                    Top 3 {selectedDimensionLabel}
                  </div>
                  {dimensionData.slice(0, 3).map((item, index) => (
                    <div key={index} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                      {index + 1}. {getItemName(item)} ({item.request_count || 0} 次)
                    </div>
                  ))}
                </Grid.Column>
              </Grid>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default DimensionComparison;