import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, Form, Loader, Message } from 'semantic-ui-react';
import { API, showError } from '../helpers';
import { isAdmin } from '../helpers/utils';
import './DimensionFilter.css';

/**
 * DimensionFilter Component
 * 
 * Provides dropdown selectors for filtering data by various dimensions:
 * - Channel: Filter by specific channel
 * - User Group: Filter by user's group
 * - Channel Group: Filter by channel's group
 * - Model: Filter by model name
 * 
 * @param {string[]} dimensions - Array of enabled dimensions (e.g., ['channel', 'user_group', 'channel_group', 'model'])
 * @param {Function} onChange - Callback when filters change: onChange(activeFilters, allFilters)
 * @param {Object} value - Current filter values (optional, for controlled mode)
 * @param {Object} timeRange - Time range for fetching stats (optional)
 */
const DimensionFilter = ({
  dimensions = ['channel', 'user_group', 'channel_group', 'model'],
  onChange,
  value = {},
  timeRange = null,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [channelOptions, setChannelOptions] = useState([]);
  const [userGroupOptions, setUserGroupOptions] = useState([]);
  const [channelGroupOptions, setChannelGroupOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  
  const [selectedFilters, setSelectedFilters] = useState({
    channel: value.channel || 'all',
    user_group: value.user_group || 'all',
    channel_group: value.channel_group || 'all',
    model: value.model || 'all',
  });

  const fetchChannelOptions = useCallback(async () => {
    try {
      const userIsAdmin = isAdmin();
      
      if (userIsAdmin) {
        const res = await API.get('/api/channel/');
        const { success, message, data } = res.data;
        if (success) {
          const options = data.map((channel) => ({
            key: channel.id,
            text: channel.name || `${t('dashboard.filters.deleted_channel')} #${channel.id}`,
            value: channel.id.toString(),
          }));
          options.unshift({
            key: 'all',
            text: t('dashboard.filters.all_channels'),
            value: 'all',
          });
          setChannelOptions(options);
        } else {
          showError(message);
        }
      } else {
        const logsRes = await API.get('/api/log/self', {
          params: { limit: 1000 }
        });
        const { success: logsSuccess, data: logsData } = logsRes.data;
        
        if (logsSuccess && logsData && logsData.length > 0) {
          const usedChannelIds = [...new Set(logsData.map(log => log.channel).filter(ch => ch > 0))];
          
          if (usedChannelIds.length === 0) {
            setChannelOptions([{
              key: 'all',
              text: t('dashboard.filters.no_used_channels'),
              value: 'all',
            }]);
            return;
          }
          
          const channelRes = await API.get('/api/channel/');
          const { success: channelSuccess, data: channelData } = channelRes.data;
          
          if (channelSuccess && channelData) {
            const usedChannels = channelData.filter(ch => usedChannelIds.includes(ch.id));
            const options = usedChannels.map((channel) => ({
              key: channel.id,
              text: channel.name || `${t('dashboard.filters.deleted_channel')} #${channel.id}`,
              value: channel.id.toString(),
            }));
            options.unshift({
              key: 'all',
              text: t('dashboard.filters.all_used_channels'),
              value: 'all',
            });
            setChannelOptions(options);
          }
        } else {
          setChannelOptions([{
            key: 'all',
            text: t('dashboard.filters.no_used_channels'),
            value: 'all',
          }]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch channel options:', err);
    }
  }, [t]);

  const fetchUserGroupOptions = useCallback(async () => {
    try {
      const params = timeRange ? { ...timeRange } : {};
      const res = await API.get('/api/stats/user-groups', { params });
      const { success, message, data } = res.data;
      if (success) {
        const options = data.map((group) => ({
          key: group.group_name || group.name,
          text: group.group_name || group.name || t('dashboard.filters.unknown_group'),
          value: group.group_name || group.name,
        }));
        options.unshift({
          key: 'all',
          text: t('dashboard.filters.all_user_groups'),
          value: 'all',
        });
        setUserGroupOptions(options);
      } else {
        showError(message);
      }
    } catch (err) {
      console.error('Failed to fetch user group options:', err);
    }
  }, [t, timeRange]);

  const fetchChannelGroupOptions = useCallback(async () => {
    try {
      const params = timeRange ? { ...timeRange } : {};
      const res = await API.get('/api/stats/channel-groups', { params });
      const { success, message, data } = res.data;
      if (success) {
        const options = data.map((group) => ({
          key: group.group_name || group.name,
          text: group.group_name || group.name || t('dashboard.filters.unknown_group'),
          value: group.group_name || group.name,
        }));
        options.unshift({
          key: 'all',
          text: t('dashboard.filters.all_channel_groups'),
          value: 'all',
        });
        setChannelGroupOptions(options);
      } else {
        showError(message);
      }
    } catch (err) {
      console.error('Failed to fetch channel group options:', err);
    }
  }, [t, timeRange]);

  const fetchModelOptions = useCallback(async () => {
    try {
      const params = timeRange ? { ...timeRange, num: 50 } : { num: 50 };
      const res = await API.get('/api/stats/models', { params });
      const { success, message, data } = res.data;
      if (success) {
        const options = data.map((model) => ({
          key: model.model_name,
          text: model.model_name || t('dashboard.filters.unknown_model'),
          value: model.model_name,
        }));
        options.unshift({
          key: 'all',
          text: t('dashboard.filters.all_models'),
          value: 'all',
        });
        setModelOptions(options);
      } else {
        showError(message);
      }
    } catch (err) {
      console.error('Failed to fetch model options:', err);
    }
  }, [t, timeRange]);

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchPromises = [];
        
        if (dimensions.includes('channel')) {
          fetchPromises.push(fetchChannelOptions());
        }
        if (dimensions.includes('user_group')) {
          fetchPromises.push(fetchUserGroupOptions());
        }
        if (dimensions.includes('channel_group')) {
          fetchPromises.push(fetchChannelGroupOptions());
        }
        if (dimensions.includes('model')) {
          fetchPromises.push(fetchModelOptions());
        }
        
        await Promise.all(fetchPromises);
      } catch (err) {
        setError(t('dashboard.filters.error.load_failed'));
        showError(err);
      }
      
      setLoading(false);
    };
    
    loadOptions();
  }, [dimensions, fetchChannelOptions, fetchUserGroupOptions, fetchChannelGroupOptions, fetchModelOptions, t]);

  useEffect(() => {
    if (value) {
      setSelectedFilters({
        channel: value.channel || 'all',
        user_group: value.user_group || 'all',
        channel_group: value.channel_group || 'all',
        model: value.model || 'all',
      });
    }
  }, [value]);

  const handleFilterChange = (dimension, newValue) => {
    const newFilters = {
      ...selectedFilters,
      [dimension]: newValue,
    };
    setSelectedFilters(newFilters);
    
    if (onChange) {
      const activeFilters = {};
      Object.keys(newFilters).forEach((key) => {
        if (newFilters[key] !== 'all') {
          activeFilters[key] = newFilters[key];
        }
      });
      onChange(activeFilters, newFilters);
    }
  };

  if (loading) {
    return (
      <div className="dimension-filter-loading">
        <Loader active size="small">{t('dashboard.filters.loading')}</Loader>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dimension-filter-error">
        <Message negative size="small">
          <Message.Header>{t('dashboard.filters.error.title')}</Message.Header>
          <p>{error}</p>
        </Message>
      </div>
    );
  }

  const renderDropdown = (dimension, options, placeholder) => {
    if (!dimensions.includes(dimension)) return null;
    
    return (
      <Form.Field className="dimension-filter-field">
        <label>{t(`dashboard.filters.${dimension}`)}</label>
        <Dropdown
          selection
          search
          clearable
          options={options}
          value={selectedFilters[dimension]}
          placeholder={placeholder}
          onChange={(e, { value }) => handleFilterChange(dimension, value || 'all')}
          className="dimension-dropdown"
          noResultsMessage={t('dashboard.filters.no_results')}
        />
      </Form.Field>
    );
  };

  return (
    <div className="dimension-filter-container">
      <Form className="dimension-filter-form">
        {renderDropdown('channel', channelOptions, t('dashboard.filters.select_channel'))}
        {renderDropdown('user_group', userGroupOptions, t('dashboard.filters.select_user_group'))}
        {renderDropdown('channel_group', channelGroupOptions, t('dashboard.filters.select_channel_group'))}
        {renderDropdown('model', modelOptions, t('dashboard.filters.select_model'))}
      </Form>
    </div>
  );
};

export default DimensionFilter;