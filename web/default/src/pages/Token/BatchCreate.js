import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  Header,
  Message,
  Card,
  Accordion,
  Icon,
  Modal,
  Table,
  TextArea,
} from 'semantic-ui-react';
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

const BatchCreate = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [modelOptions, setModelOptions] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [namesText, setNamesText] = useState('');
  const [results, setResults] = useState(null);

  const originInputs = {
    remain_quota: 500000,
    expired_time: -1,
    unlimited_quota: false,
    models: [],
    subnet: '',
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

  // Parse names from textarea (comma, newline, or semicolon separated)
  const parsedNames = namesText
    .split(/[,\n;]+/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  const namesCount = parsedNames.length;

  const handleInputChange = (e, { name, value }) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
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
    if (open) {
      loadAvailableModels().catch((error) => {
        showError(error.message || 'Failed to load models');
      });
    }
  }, [open]);

  const submit = async () => {
    if (namesCount === 0) {
      showError('Please enter at least one token name');
      return;
    }
    if (namesCount > 100) {
      showError('Maximum 100 tokens allowed per batch');
      return;
    }

    setLoading(true);
    let localInputs = { ...inputs };
    localInputs.remain_quota = parseInt(localInputs.remain_quota);
    if (localInputs.expired_time !== -1) {
      let time = Date.parse(localInputs.expired_time);
      if (isNaN(time)) {
        showError(t('token.edit.messages.expire_time_invalid'));
        setLoading(false);
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

    // Add names as a string (comma-separated)
    localInputs.names = parsedNames.join(',');

    try {
      const res = await API.post('/api/token/batch', localInputs);
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`Successfully created ${data.success_count} tokens`);
        setResults(data);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        showError(message);
      }
    } catch (error) {
      showError(error.message || 'Network error');
    }
    setLoading(false);
  };

  const copyAllKeys = async () => {
    if (!results || !results.results) return;
    const keys = results.results
      .filter((r) => r.success)
      .map((r) => `sk-${r.key}`)
      .join('\n');
    if (await copy(keys)) {
      showSuccess('All keys copied to clipboard');
    }
  };

  const handleClose = () => {
    setNamesText('');
    setInputs(originInputs);
    setResults(null);
    setShowAdvanced(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} size="large">
      <Modal.Header>{t('token.batch.modal_title')}</Modal.Header>
      <Modal.Content scrolling>
        {!results ? (
          <Form loading={loading} autoComplete='new-password'>
            <Form.Field>
              <label>{t('token.batch.token_names_label')}</label>
              <TextArea
                placeholder={t('token.batch.token_names_placeholder')}
                value={namesText}
                onChange={(e, { value }) => setNamesText(value)}
                rows={5}
                style={{ fontFamily: 'monospace' }}
              />
              <Message info size='small'>
                {namesCount > 0 ? (
                  <span>
                    <strong>{namesCount}</strong> {t('token.batch.tokens_will_be_created')}
                    {namesCount > 100 && (
                      <span style={{ color: 'red', marginLeft: '10px' }}>
                        {t('token.batch.max_100_warning')}
                      </span>
                    )}
                  </span>
                ) : (
                  t('token.batch.enter_names_above')
                )}
              </Message>
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
            <div style={{ lineHeight: '40px', marginBottom: '10px' }}>
              <Button
                type={'button'}
                size='small'
                onClick={() => {
                  setExpiredTime(0, 0, 0, 0);
                }}
              >
                {t('token.edit.buttons.never_expire')}
              </Button>
              <Button
                type={'button'}
                size='small'
                onClick={() => {
                  setExpiredTime(1, 0, 0, 0);
                }}
              >
                {t('token.edit.buttons.expire_1_month')}
              </Button>
              <Button
                type={'button'}
                size='small'
                onClick={() => {
                  setExpiredTime(0, 1, 0, 0);
                }}
              >
                {t('token.edit.buttons.expire_1_day')}
              </Button>
              <Button
                type={'button'}
                size='small'
                onClick={() => {
                  setExpiredTime(0, 0, 1, 0);
                }}
              >
                {t('token.edit.buttons.expire_1_hour')}
              </Button>
              <Button
                type={'button'}
                size='small'
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
          </Form>
        ) : (
          <div>
            <Message success>
              <Message.Header>{t('token.batch.modal_complete_header')}</Message.Header>
              <p>
                {t('token.batch.modal_complete_message', {
                  success_count: results.success_count,
                  fail_count: results.fail_count
                })}
              </p>
            </Message>
            <Button primary onClick={copyAllKeys} style={{ marginBottom: '15px' }}>
              <Icon name='copy' /> {t('token.batch.copy_all_keys')}
            </Button>
            <Button onClick={() => setResults(null)} style={{ marginBottom: '15px' }}>
              {t('token.batch.create_more')}
            </Button>
            <Table celled striped>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>{t('token.batch.table.name')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('token.batch.table.key')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('token.batch.table.status')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('token.batch.table.action')}</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {results.results.map((result, idx) => (
                  <Table.Row key={idx}>
                    <Table.Cell>{result.name}</Table.Cell>
                    <Table.Cell>
                      <code style={{ userSelect: 'all' }}>sk-{result.key}</code>
                    </Table.Cell>
                    <Table.Cell>
                      {result.success ? (
                        <span style={{ color: 'green' }}>{t('token.batch.table.success')}</span>
                      ) : (
                        <span style={{ color: 'red' }}>{result.error || t('token.batch.table.failed')}</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {result.success && (
                        <Button
                          size='tiny'
                          onClick={async () => {
                            if (await copy(`sk-${result.key}`)) {
                              showSuccess(t('token.batch.key_copied'));
                            }
                          }}
                        >
                          Copy
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </Modal.Content>
      <Modal.Actions>
        {!results ? (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              positive
              onClick={submit}
              loading={loading}
              disabled={namesCount === 0 || namesCount > 100}
            >
              Create {namesCount > 0 ? `(${namesCount})` : ''}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>Close</Button>
        )}
      </Modal.Actions>
    </Modal>
  );
};

export default BatchCreate;