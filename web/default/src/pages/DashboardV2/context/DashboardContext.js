import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API } from '../../../helpers';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const [timeRange, setTimeRangeState] = useState({
    startTimestamp: 0,
    endTimestamp: 0,
    preset: '7d'
  });
  const [granularity, setGranularityState] = useState('day');
  const [dashboardData, setDashboardData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Transform flat array data to object structure expected by DashboardV2
  const transformModels = useCallback((data) => {
    const modelMap = {};
    data.forEach(item => {
      if (!modelMap[item.model_name]) {
        modelMap[item.model_name] = {
          model_name: item.model_name,
          request_count: 0,
          quota: 0,
          prompt_tokens: 0,
          completion_tokens: 0
        };
      }
      modelMap[item.model_name].request_count += item.request_count || 0;
      modelMap[item.model_name].quota += item.quota || 0;
      modelMap[item.model_name].prompt_tokens += item.prompt_tokens || 0;
      modelMap[item.model_name].completion_tokens += item.completion_tokens || 0;
    });

    // Convert to array and sort by request_count (descending), take top 10
    return Object.values(modelMap)
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 10);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 调试日志：打印 timeRange 和 granularity
      console.log('[DashboardContext] fetchDashboardData 被调用:', {
        startTimestamp: timeRange.startTimestamp,
        endTimestamp: timeRange.endTimestamp,
        granularity
      });

      const params = new URLSearchParams();
      if (timeRange.startTimestamp) {
        params.append('start_timestamp', timeRange.startTimestamp);
      }
      if (timeRange.endTimestamp) {
        params.append('end_timestamp', timeRange.endTimestamp);
      }
      if (granularity) {
        params.append('granularity', granularity);
      }

      // 调试日志：打印 API 请求 URL
      const apiUrl = `/api/user/dashboard?${params.toString()}`;
      console.log('[DashboardContext] API 请求 URL:', apiUrl);

      const response = await API.get(apiUrl);

      // 调试日志：打印 API 响应数据
      console.log('[DashboardContext] API 响应数据:', response.data);

      // Handle flat array response from backend
      // Backend returns: [{time_slot, model_name, request_count, ...}]
      // DashboardV2 expects: {time_series: [...], channels: [], models: [...]}
      const flatArray = response.data?.data || [];

      // Transform to object structure
      const transformedData = {
        time_series: flatArray,  // Keep original time series data
        channels: [],  // Empty for now (not available in this API)
        models: transformModels(flatArray)  // Aggregate by model_name
      };

      console.log('[DashboardContext] 转换后的数据:', transformedData);

      setDashboardData(transformedData);
    } catch (err) {
      // 调试日志：打印错误信息
      console.log('[DashboardContext] 错误信息:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [timeRange, granularity, transformModels]);

  const fetchHeatmapData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[DashboardContext] fetchHeatmapData 被调用:', {
        startTimestamp: timeRange.startTimestamp,
        endTimestamp: timeRange.endTimestamp
      });

      const params = new URLSearchParams();
      if (timeRange.startTimestamp) {
        params.append('start_timestamp', timeRange.startTimestamp);
      }
      if (timeRange.endTimestamp) {
        params.append('end_timestamp', timeRange.endTimestamp);
      }

      const apiUrl = `/api/stats/heatmap?${params.toString()}`;
      console.log('[DashboardContext] Heatmap API 请求 URL:', apiUrl);

      const response = await API.get(apiUrl);
      console.log('[DashboardContext] Heatmap API 响应数据:', response.data);

      setHeatmapData(response.data);
    } catch (err) {
      console.log('[DashboardContext] Heatmap 错误信息:', err);
      setError(err.message || 'Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchChannelData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[DashboardContext] fetchChannelData 被调用:', {
        startTimestamp: timeRange.startTimestamp,
        endTimestamp: timeRange.endTimestamp
      });

      const params = new URLSearchParams();
      if (timeRange.startTimestamp) {
        params.append('start_timestamp', timeRange.startTimestamp);
      }
      if (timeRange.endTimestamp) {
        params.append('end_timestamp', timeRange.endTimestamp);
      }

      const apiUrl = `/api/stats/channels?${params.toString()}`;
      console.log('[DashboardContext] Channel API 请求 URL:', apiUrl);

      const response = await API.get(apiUrl);
      console.log('[DashboardContext] Channel API 响应数据:', response.data);

      setChannelData(response.data);
    } catch (err) {
      console.log('[DashboardContext] Channel 错误信息:', err);
      setError(err.message || 'Failed to fetch channel data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const setTimeRange = useCallback((range) => {
    setTimeRangeState(range);
  }, []);

  const setGranularity = useCallback((gran) => {
    setGranularityState(gran);
  }, []);

  useEffect(() => {
    console.log('[DashboardContext] timeRange 变化:', timeRange);
    if (timeRange.startTimestamp && timeRange.endTimestamp) {
      console.log('[DashboardContext] 触发数据获取:', {
        startTimestamp: timeRange.startTimestamp,
        endTimestamp: timeRange.endTimestamp,
        granularity
      });
      fetchDashboardData();
      fetchHeatmapData();
      fetchChannelData();
    } else {
      console.log('[DashboardContext] 未触发数据获取，条件不满足:', {
        startTimestamp: timeRange.startTimestamp,
        endTimestamp: timeRange.endTimestamp
      });
    }
  }, [timeRange, fetchDashboardData, fetchHeatmapData, fetchChannelData]);

  useEffect(() => {
    console.log('[DashboardContext] granularity 变化:', granularity);
    if (timeRange.startTimestamp && timeRange.endTimestamp) {
      console.log('[DashboardContext] granularity 变化触发数据获取');
      fetchDashboardData();
    }
  }, [granularity, fetchDashboardData, timeRange]);

  const value = {
    timeRange,
    setTimeRange,
    granularity,
    setGranularity,
    dashboardData,
    heatmapData,
    channelData,
    loading,
    error,
    fetchDashboardData,
    fetchHeatmapData,
    fetchChannelData
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export default DashboardContext;
