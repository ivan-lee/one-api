import React, { useState } from 'react';
import { Card, Button } from 'semantic-ui-react';
import TokensTable from '../../components/TokensTable';
import { useTranslation } from 'react-i18next';
import BatchCreate from './BatchCreate';

const Token = () => {
  const { t } = useTranslation();
  const [showBatchCreate, setShowBatchCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBatchCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className='dashboard-container'>
      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header className='header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('token.title')}</span>
            <Button
              size='small'
              primary
              onClick={() => setShowBatchCreate(true)}
            >
              Batch Create
            </Button>
          </Card.Header>
          <TokensTable key={refreshKey} />
        </Card.Content>
      </Card>
      <BatchCreate
        open={showBatchCreate}
        onClose={() => setShowBatchCreate(false)}
        onSuccess={handleBatchCreateSuccess}
      />
    </div>
  );
};

export default Token;
