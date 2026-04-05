import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Tab } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

const DashboardV2 = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const tabMap = {
    'overview': 0,
    'time-analysis': 1,
    'dimension-comparison': 2,
    'model-insight': 3
  };

  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    if (tabMap[hash] !== undefined) {
      return tabMap[hash];
    }
    if (hash !== 'overview') {
      navigate('#overview', { replace: true });
    }
    return 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  const handleTabChange = (e, { activeIndex }) => {
    setActiveTab(activeIndex);
    const hashKey = Object.keys(tabMap).find(key => tabMap[key] === activeIndex);
    navigate(`#${hashKey}`);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = location.hash.replace('#', '');
      if (tabMap[hash] !== undefined) {
        setActiveTab(tabMap[hash]);
      } else {
        navigate('#overview', { replace: true });
        setActiveTab(0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [location, navigate]);

  const panes = [
    {
      menuItem: t('dashboard.tabs.overview') || '概览',
      render: () => (
        <Tab.Pane attached={false}>
          <div style={{ padding: '20px' }}>
            Overview Content Placeholder
          </div>
        </Tab.Pane>
      ),
    },
    {
      menuItem: t('dashboard.tabs.time-analysis') || '时段分析',
      render: () => (
        <Tab.Pane attached={false}>
          <div style={{ padding: '20px' }}>
            Time Analysis Content Placeholder
          </div>
        </Tab.Pane>
      ),
    },
    {
      menuItem: t('dashboard.tabs.dimension-comparison') || '维度对比',
      render: () => (
        <Tab.Pane attached={false}>
          <div style={{ padding: '20px' }}>
            Dimension Comparison Content Placeholder
          </div>
        </Tab.Pane>
      ),
    },
    {
      menuItem: t('dashboard.tabs.model-insight') || '模型洞察',
      render: () => (
        <Tab.Pane attached={false}>
          <div style={{ padding: '20px' }}>
            Model Insight Content Placeholder
          </div>
        </Tab.Pane>
      ),
    },
  ];

  return (
    <div className='dashboard-container'>
      <Card fluid className='chart-card'>
        <Card.Content>
          <Card.Header className='header'>
            {t('dashboard.title') || '数据仪表盘'}
          </Card.Header>
          <Tab
            menu={{
              secondary: true,
              pointing: true,
              className: 'dashboard-tab',
            }}
            panes={panes}
            activeIndex={activeTab}
            onTabChange={handleTabChange}
          />
        </Card.Content>
      </Card>
    </div>
  );
};

export default DashboardV2;