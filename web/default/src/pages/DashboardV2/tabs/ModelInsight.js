import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Grid, Dropdown, Loader, Message } from 'semantic-ui-react';
import { useDashboard } from '../context/DashboardContext';
import StackedGroupedBarChart from '../../../components/charts/StackedGroupedBarChart';
import RadarChart from '../../../components/charts/RadarChart';
import '../../Dashboard/Dashboard.css';

const ModelInsight = () => {
  const { t } = useTranslation();
  const { dashboardData, loading, error, granularity } = useDashboard();
  const [selectedModel, setSelectedModel] = useState(null);

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

  const modelOptions = useMemo(() => {
    if (!dashboardData?.models) return [];
    
    const options = dashboardData.models.map((model) => ({
      key: model.model_name,
      text: model.model_name || 'Unknown',
      value: model.model_name,
    }));
    
    options.unshift({
      key: 'all',
      text: t('dashboard.filters.all_models') || '全部模型',
      value: null,
    });
    
    return options;
  }, [dashboardData?.models, t]);

  const stackedBarData = useMemo(() => {
    if (!dashboardData?.time_series || !dashboardData?.models) return [];
    
    const topModels = (dashboardData.models || [])
      .slice(0, 5)
      .map(m => m.model_name || 'Unknown');
    
    // time_series contains aggregate data per time slot without model breakdown.
    // We proportionally distribute tokens based on each model's request share.
    return dashboardData.time_series.map((item) => {
      const totalTokens = (item.prompt_tokens || 0) + (item.completion_tokens || 0);
      const totalModelRequests = dashboardData.models.reduce(
        (sum, m) => sum + (m.request_count || 0), 0
      );
      
      const result = {
        time_slot: formatTimeByGranularity(item.time_slot),
        time_slot_raw: item.time_slot,
      };
      
      topModels.forEach((modelName) => {
        const modelData = dashboardData.models.find(m => m.model_name === modelName);
        const modelRatio = modelData 
          ? (modelData.request_count || 0) / totalModelRequests 
          : 0;
        result[modelName] = Math.round(totalTokens * modelRatio);
      });
      
      return result;
    });
  }, [dashboardData?.time_series, dashboardData?.models, formatTimeByGranularity]);

  const stackKeys = useMemo(() => {
    if (!dashboardData?.models) return [];
    return (dashboardData.models || [])
      .slice(0, 5)
      .map(m => m.model_name || 'Unknown');
  }, [dashboardData?.models]);

  const radarData = useMemo(() => {
    if (!dashboardData?.models) return [];
    
    const dimensions = [
      { key: 'requests', label: '请求量', max: 100 },
      { key: 'tokens', label: 'Tokens', max: 100 },
      { key: 'quota', label: '消费($)', max: 100 },
      { key: 'efficiency', label: '效率', max: 100 },
    ];
    
    let modelsToCompare = dashboardData.models || [];
    if (selectedModel) {
      modelsToCompare = modelsToCompare.filter(m => m.model_name === selectedModel);
    } else {
      modelsToCompare = modelsToCompare.slice(0, 5);
    }
    
    const maxRequests = Math.max(...modelsToCompare.map(m => m.request_count || 0), 1);
    const maxTokens = Math.max(
      ...modelsToCompare.map(m => (m.prompt_tokens || 0) + (m.completion_tokens || 0)), 
      1
    );
    const maxQuota = Math.max(...modelsToCompare.map(m => (m.quota || 0) / 1000000), 0.01);
    
    return dimensions.map((dim) => {
      const result = { dimension: dim.label };
      
      modelsToCompare.forEach((model) => {
        const modelName = model.model_name || 'Unknown';
        let normalizedValue = 0;
        
        switch (dim.key) {
          case 'requests':
            normalizedValue = Math.round((model.request_count || 0) / maxRequests * 100);
            break;
          case 'tokens':
            const totalTokens = (model.prompt_tokens || 0) + (model.completion_tokens || 0);
            normalizedValue = Math.round(totalTokens / maxTokens * 100);
            break;
          case 'quota':
            normalizedValue = Math.round((model.quota || 0) / 1000000 / maxQuota * 100);
            break;
          case 'efficiency':
            // Efficiency metric: average tokens per request, normalized to 0-100 scale
            const tokens = (model.prompt_tokens || 0) + (model.completion_tokens || 0);
            const requests = model.request_count || 1;
            const avgTokens = tokens / requests;
            const maxAvgTokens = 10000;
            normalizedValue = Math.round(Math.min(avgTokens / maxAvgTokens * 100, 100));
            break;
        }
        
        result[modelName] = normalizedValue;
      });
      
      return result;
    });
  }, [dashboardData?.models, selectedModel]);

  const radarMetrics = useMemo(() => {
    if (!dashboardData?.models) return [];
    
    if (selectedModel) {
      return [selectedModel];
    }
    
    return (dashboardData.models || [])
      .slice(0, 5)
      .map(m => m.model_name || 'Unknown');
  }, [dashboardData?.models, selectedModel]);

  const handleModelChange = (e, { value }) => {
    setSelectedModel(value);
  };

  if (loading) {
    return (
      <div className='dashboard-loader'>
        <Loader active size='large'>
          {t('dashboard.stats.loading') || '加载中...'}
        </Loader>
      </div>
    );
  }

  if (error) {
    return (
      <Message negative>
        <Message.Header>{t('dashboard.stats.error.title') || '错误'}</Message.Header>
        <p>{error}</p>
      </Message>
    );
  }

  if (!dashboardData || !dashboardData.models || dashboardData.models.length === 0) {
    return (
      <Message warning>
        <Message.Header>{t('dashboard.stats.no_data.title') || '暂无数据'}</Message.Header>
        <p>{t('dashboard.stats.no_data.description') || '当前时间范围内没有模型数据'}</p>
      </Message>
    );
  }

  return (
    <div className='model-insight-content'>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontWeight: '500', color: '#2B3674' }}>
          {t('dashboard.filters.model') || '模型筛选'}:
        </span>
        <Dropdown
          placeholder={t('dashboard.filters.select_model') || '选择模型'}
          selection
          clearable
          options={modelOptions}
          value={selectedModel}
          onChange={handleModelChange}
          style={{ minWidth: '200px' }}
        />
      </div>

      <Grid className='charts-grid'>
        <Grid.Row>
          <Grid.Column width={16}>
            <Card fluid className='chart-card'>
              <Card.Content>
                <Card.Header>
                  {t('dashboard.charts.model_distribution.title') || '模型堆叠图 - Token 分布'}
                </Card.Header>
                <div className='chart-container' style={{ marginTop: '16px' }}>
                  <StackedGroupedBarChart
                    data={stackedBarData}
                    groupKey='time_slot'
                    stackKeys={stackKeys}
                    height={350}
                    showLegend={true}
                    showTooltip={true}
                    emptyMessage={t('dashboard.charts.no_data') || '暂无数据'}
                    valueFormatter={(value) => `${value} tokens`}
                  />
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>
        </Grid.Row>

        <Grid.Row>
          <Grid.Column width={16}>
            <Card fluid className='chart-card'>
              <Card.Content>
                <Card.Header>
                  {t('dashboard.charts.model_radar.title') || '雷达图 - 模型指标对比'}
                </Card.Header>
                <div className='chart-container' style={{ marginTop: '16px' }}>
                  <RadarChart
                    data={radarData}
                    metrics={radarMetrics}
                    dimensionKey='dimension'
                    height={400}
                    showLegend={true}
                    showTooltip={true}
                  />
                </div>
              </Card.Content>
            </Card>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </div>
  );
};

export default ModelInsight;