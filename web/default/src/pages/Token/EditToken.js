import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  Header,
  Message,
  Card,
  Accordion,
  Icon,
} from 'semantic-ui-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  API,
  copy,
  showError,
  showSuccess,
  timestamp2string,
} from '../../helpers';
import { renderQuotaWithPrompt } from '../../helpers/render';

// Common timezone options
const timezoneOptions = [
  { key: '', text: 'System Default', value: '' },
  { key: 'UTC', text: 'UTC', value: 'UTC' },
  { key: 'Asia/Shanghai', text: 'Asia/Shanghai (Beijing)', value: 'Asia/Shanghai' },
  { key: 'Asia/Tokyo', text: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { key: 'America/New_York', text: 'America/New_York', value: 'America/New_York' },
  { key: 'America/Los_Angeles', text: 'America/Los_Angeles', value: 'America/Los_Angeles' },
  { key: 'Europe/London', text: 'Europe/London', value: 'Europe/London' },
  { key: 'Europe/Paris', text: 'Europe/Paris', value: 'Europe/Paris' },
];

const EditToken = () => {
  const { t } = useTranslation();
  const params = useParams();
  const tokenId = params.id;
  const isEdit = tokenId !== undefined;
  const [loading, setLoading] = useState(isEdit);
  const [modelOptions, setModelOptions] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const originInputs = {
    name: '',
    remain_quota: isEdit ? 0 : 500000,
    expired_time: -1,
    unlimited_quota: false,
    models: [],
    subnet: '',
    // Time-window quota control fields
    daily_quota_limit: -1,
    hourly_quota_limit: -1,
    monthly_quota_limit: -1,
    quota_reset_time: '',
    quota_timezone: '',
    model_quotas: '',
    requests_per_minute: -1,
    requests_per_hour: -1,
    allowed_hours: '',
    allowed_days: '',
  };
  const [inputs, setInputs] = useState(originInputs);
  const { 
    name, 
    remain_quota, 
    expired_time, 
    unlimited_quota,
    daily_quota_limit,
    hourly_quota_limit,
    monthly_quota_limit,
    quota_reset_time,
    quota_timezone,
    model_quotas,
    requests_per_minute,
    requests_per_hour,
    allowed_hours,
    allowed_days,
  } = inputs;
  const navigate = useNavigate();
  const handleInputChange = (e, { name, value }) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };
  const handleCancel = () => {
    navigate('/token');
  };
  const setExpiredTime = (month, day, hour, minute) => {
    let now = new Date();
    let timestamp = now.getTime() / 1000;
    let seconds = month * 30 * 24 * 60 * 60;
    seconds += day * 24 * 60 * 60;
    seconds += hour * 60 * 60;
    seconds += minute * 60;
    if (seconds !== 0) {
      timestamp += seconds;
      setInputs({ ...inputs, expired_time: timestamp2string(timestamp) });
    } else {
      setInputs({ ...inputs, expired_time: -1 });
    }
  };

  const setUnlimitedQuota = () => {
    setInputs({ ...inputs, unlimited_quota: !unlimited_quota });
  };

  const loadToken = async () => {
    try {
      let res = await API.get(`/api/token/${tokenId}`);
      const { success, message, data } = res.data || {};
      if (success && data) {
        if (data.expired_time !== -1) {
          data.expired_time = timestamp2string(data.expired_time);
        }
        if (data.models === '') {
          data.models = [];
        } else {
          data.models = data.models.split(',');
        }
        // Handle nullable string fields
        if (data.quota_timezone === null) {
          data.quota_timezone = '';
        }
        if (data.model_quotas === null) {
          data.model_quotas = '';
        }
        if (data.allowed_hours === null) {
          data.allowed_hours = '';
        }
        if (data.allowed_days === null) {
          data.allowed_days = '';
        }
        // Handle quota_reset_time
        if (data.quota_reset_time && data.quota_reset_time !== 0) {
          data.quota_reset_time = timestamp2string(data.quota_reset_time);
        } else {
          data.quota_reset_time = '';
        }
        setInputs(data);
      } else {
        showError(message || 'Failed to load token');
      }
    } catch (error) {
      showError(error.message || 'Network error');
    }
    setLoading(false);
  };

  const loadAvailableModels = async () => {
    try {
      let res = await API.get(`/api/user/available_models`);
      const { success, message, data } = res.data || {};
      if (success && data) {
        let options = data.map((model) => {
          return {
            key: model,
            text: model,
            value: model,
          };
        });
        setModelOptions(options);
      } else {
        showError(message || 'Failed to load models');
      }
    } catch (error) {
      showError(error.message || 'Network error');
    }
  };

  useEffect(() => {
    if (isEdit) {
      loadToken().catch((error) => {
        showError(error.message || 'Failed to load token');
        setLoading(false);
      });
    }
    loadAvailableModels().catch((error) => {
      showError(error.message || 'Failed to load models');
    });
  }, []);

  const submit = async () => {
    if (!isEdit && inputs.name === '') return;
    let localInputs = { ...inputs };
    localInputs.remain_quota = parseInt(localInputs.remain_quota);
    if (localInputs.expired_time !== -1) {
      let time = Date.parse(localInputs.expired_time);
      if (isNaN(time)) {
        showError(t('token.edit.messages.expire_time_invalid'));
        return;
      }
      localInputs.expired_time = Math.ceil(time / 1000);
    }
    localInputs.models = localInputs.models.join(',');
    
    // Process quota limit fields - convert empty/0 to -1 (unlimited)
    localInputs.daily_quota_limit = parseInt(localInputs.daily_quota_limit) || -1;
    localInputs.hourly_quota_limit = parseInt(localInputs.hourly_quota_limit) || -1;
    localInputs.monthly_quota_limit = parseInt(localInputs.monthly_quota_limit) || -1;
    localInputs.requests_per_minute = parseInt(localInputs.requests_per_minute) || -1;
    localInputs.requests_per_hour = parseInt(localInputs.requests_per_hour) || -1;
    
    // Process quota_reset_time
    if (localInputs.quota_reset_time && localInputs.quota_reset_time !== '') {
      let resetTime = Date.parse(localInputs.quota_reset_time);
      if (!isNaN(resetTime)) {
        localInputs.quota_reset_time = Math.ceil(resetTime / 1000);
      } else {
        localInputs.quota_reset_time = 0;
      }
    } else {
      localInputs.quota_reset_time = 0;
    }
    
    // Process nullable string fields
    if (localInputs.quota_timezone === '') {
      localInputs.quota_timezone = null;
    }
    if (localInputs.model_quotas === '') {
      localInputs.model_quotas = null;
    }
    if (localInputs.allowed_hours === '') {
      localInputs.allowed_hours = null;
    }
    if (localInputs.allowed_days === '') {
      localInputs.allowed_days = null;
    }
    
    let res;
    if (isEdit) {
      res = await API.put(`/api/token/`, {
        ...localInputs,
        id: parseInt(tokenId),
      });
    } else {
      res = await API.post(`/api/token/`, localInputs);
    }
    const { success, message } = res.data;
    if (success) {
      if (isEdit) {
        showSuccess(t('token.edit.messages.update_success'));
      } else {
        showSuccess(t('token.edit.messages.create_success'));
        setInputs(originInputs);
      }
    } else {
      showError(message);
    }
  };

  return (
    <div className='dashboard-container'>
      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header className='header'>
            {isEdit ? t('token.edit.title_edit') : t('token.edit.title_create')}
          </Card.Header>
          <Form loading={loading} autoComplete='new-password'>
            <Form.Field>
              <Form.Input
                label={t('token.edit.name')}
                name='name'
                placeholder={t('token.edit.name_placeholder')}
                onChange={handleInputChange}
                value={name}
                autoComplete='new-password'
                required={!isEdit}
              />
            </Form.Field>
            <Form.Field>
              <Form.Dropdown
                label={t('token.edit.models')}
                placeholder={t('token.edit.models_placeholder')}
                name='models'
                fluid
                multiple
                search
                onLabelClick={(e, { value }) => {
                  copy(value).then();
                }}
                selection
                onChange={handleInputChange}
                value={inputs.models}
                autoComplete='new-password'
                options={modelOptions}
              />
            </Form.Field>
            <Form.Field>
              <Form.Input
                label={t('token.edit.ip_limit')}
                name='subnet'
                placeholder={t('token.edit.ip_limit_placeholder')}
                onChange={handleInputChange}
                value={inputs.subnet}
                autoComplete='new-password'
              />
            </Form.Field>
            <Form.Field>
              <Form.Input
                label={t('token.edit.expire_time')}
                name='expired_time'
                placeholder={t('token.edit.expire_time_placeholder')}
                onChange={handleInputChange}
                value={expired_time}
                autoComplete='new-password'
                type='datetime-local'
              />
            </Form.Field>
            <div style={{ lineHeight: '40px' }}>
              <Button
                type={'button'}
                onClick={() => {
                  setExpiredTime(0, 0, 0, 0);
                }}
              >
                {t('token.edit.buttons.never_expire')}
              </Button>
              <Button
                type={'button'}
                onClick={() => {
                  setExpiredTime(1, 0, 0, 0);
                }}
              >
                {t('token.edit.buttons.expire_1_month')}
              </Button>
              <Button
                type={'button'}
                onClick={() => {
                  setExpiredTime(0, 1, 0, 0);
                }}
              >
                {t('token.edit.buttons.expire_1_day')}
              </Button>
              <Button
                type={'button'}
                onClick={() => {
                  setExpiredTime(0, 0, 1, 0);
                }}
              >
                {t('token.edit.buttons.expire_1_hour')}
              </Button>
              <Button
                type={'button'}
                onClick={() => {
                  setExpiredTime(0, 0, 0, 1);
                }}
              >
                {t('token.edit.buttons.expire_1_minute')}
              </Button>
            </div>
            <Message>{t('token.edit.quota_notice')}</Message>
            <Form.Field>
              <Form.Input
                label={`${t('token.edit.quota')}${renderQuotaWithPrompt(
                  remain_quota,
                  t
                )}`}
                name='remain_quota'
                placeholder={t('token.edit.quota_placeholder')}
                onChange={handleInputChange}
                value={remain_quota}
                autoComplete='new-password'
                type='number'
                disabled={unlimited_quota}
              />
            </Form.Field>
            <Button
              type={'button'}
              onClick={() => {
                setUnlimitedQuota();
              }}
            >
              {unlimited_quota
                ? t('token.edit.buttons.cancel_unlimited')
                : t('token.edit.buttons.unlimited_quota')}
            </Button>
            
            <Accordion fluid styled style={{ marginTop: '20px' }}>
              <Accordion.Title
                active={showAdvanced}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Icon name='dropdown' />
                {t('token.edit.advanced_quota_control')}
              </Accordion.Title>
              <Accordion.Content active={showAdvanced}>
                <Message info size='small'>
                  <Message.Header>{t('token.edit.quota_control_settings')}</Message.Header>
                  <p>{t('token.edit.quota_control_help')}</p>
                </Message>
                
                <Header as='h5'>{t('token.edit.time_window_quota_limits')}</Header>
                <Form.Group widths='equal'>
                  <Form.Input
                    label={t('token.edit.daily_quota_limit')}
                    name='daily_quota_limit'
                    placeholder='-1'
                    onChange={handleInputChange}
                    value={daily_quota_limit}
                    type='number'
                  />
                  <Form.Input
                    label={t('token.edit.hourly_quota_limit')}
                    name='hourly_quota_limit'
                    placeholder='-1'
                    onChange={handleInputChange}
                    value={hourly_quota_limit}
                    type='number'
                  />
                  <Form.Input
                    label={t('token.edit.monthly_quota_limit')}
                    name='monthly_quota_limit'
                    placeholder='-1'
                    onChange={handleInputChange}
                    value={monthly_quota_limit}
                    type='number'
                  />
                </Form.Group>
                
                <Header as='h5'>{t('token.edit.quota_reset_and_timezone')}</Header>
                <Form.Group widths='equal'>
                  <Form.Input
                    label={t('token.edit.quota_reset_time')}
                    name='quota_reset_time'
                    placeholder={t('token.edit.quota_reset_time_placeholder')}
                    onChange={handleInputChange}
                    value={quota_reset_time}
                    type='datetime-local'
                  />
                  <Form.Select
                    label={t('token.edit.quota_timezone')}
                    name='quota_timezone'
                    placeholder={t('token.edit.quota_timezone_placeholder')}
                    options={timezoneOptions}
                    onChange={handleInputChange}
                    value={quota_timezone}
                    clearable
                  />
                </Form.Group>
                
                <Header as='h5'>{t('token.edit.rate_limits')}</Header>
                <Form.Group widths='equal'>
                  <Form.Input
                    label={t('token.edit.requests_per_minute')}
                    name='requests_per_minute'
                    placeholder='-1'
                    onChange={handleInputChange}
                    value={requests_per_minute}
                    type='number'
                  />
                  <Form.Input
                    label={t('token.edit.requests_per_hour')}
                    name='requests_per_hour'
                    placeholder='-1'
                    onChange={handleInputChange}
                    value={requests_per_hour}
                    type='number'
                  />
                </Form.Group>
                
                <Header as='h5'>{t('token.edit.time_window_access_control')}</Header>
                <Message size='small'>
                  {t('token.edit.allowed_hours_help')}
                </Message>
                <Form.Field>
                  <Form.Input
                    label={t('token.edit.allowed_hours')}
                    name='allowed_hours'
                    placeholder='[9,10,11,12,13,14,15,16,17]'
                    onChange={handleInputChange}
                    value={allowed_hours}
                  />
                </Form.Field>
                <Message size='small'>
                  {t('token.edit.allowed_days_help')}
                </Message>
                <Form.Field>
                  <Form.Input
                    label={t('token.edit.allowed_days')}
                    name='allowed_days'
                    placeholder='[1,2,3,4,5]'
                    onChange={handleInputChange}
                    value={allowed_days}
                  />
                </Form.Field>
                
                <Header as='h5'>{t('token.edit.model_specific_quotas')}</Header>
                <Message size='small'>
                  {t('token.edit.model_quotas_help')}
                  <br />
                  <code>{'[{"model": "gpt-4", "limit": 100000}, {"model": "gpt-3.5-turbo", "limit": 500000}]'}</code>
                </Message>
                <Form.Field>
                  <Form.TextArea
                    label={t('token.edit.model_quotas')}
                    name='model_quotas'
                    placeholder={'[{"model": "gpt-4", "limit": 100000}]'}
                    onChange={handleInputChange}
                    value={model_quotas}
                    rows={4}
                  />
                </Form.Field>
              </Accordion.Content>
            </Accordion>
            
            <Button floated='right' positive onClick={submit}>
              {t('token.edit.buttons.submit')}
            </Button>
            <Button floated='right' onClick={handleCancel}>
              {t('token.edit.buttons.cancel')}
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </div>
  );
};

export default EditToken;
