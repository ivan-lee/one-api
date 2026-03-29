import React from 'react';
import { Button } from 'semantic-ui-react';

const GranularitySelector = ({ value = 'day', onChange }) => {
  const options = [
    { key: 'hour', value: 'hour', label: '小时' },
    { key: 'day', value: 'day', label: '天' },
    { key: 'week', value: 'week', label: '周' },
    { key: 'month', value: 'month', label: '月' },
  ];

  const handleClick = (newValue) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <Button.Group color='green' size='small'>
      {options.map((option) => (
        <Button
          key={option.key}
          active={value === option.value}
          onClick={() => handleClick(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </Button.Group>
  );
};

export default GranularitySelector;