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

  const fetchDashboardData = useCallback(async () => {
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
      if (granularity) {
        params.append('granularity', granularity);
      }

      const response = await API.get(`/api/user/dashboard?${params.toString()}`);
      setDashboardData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [timeRange, granularity]);

  const fetchHeatmapData = useCallback(async () => {
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

      const response = await API.get(`/api/stats/heatmap?${params.toString()}`);
      setHeatmapData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch heatmap data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchChannelData = useCallback(async () => {
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

      const response = await API.get(`/api/stats/channels?${params.toString()}`);
      setChannelData(response.data);
    } catch (err) {
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
    if (timeRange.startTimestamp && timeRange.endTimestamp) {
      fetchDashboardData();
      fetchHeatmapData();
      fetchChannelData();
    }
  }, [timeRange, fetchDashboardData, fetchHeatmapData, fetchChannelData]);

  useEffect(() => {
    if (timeRange.startTimestamp && timeRange.endTimestamp) {
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
