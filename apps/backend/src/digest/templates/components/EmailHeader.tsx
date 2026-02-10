import { Img, Section } from '@react-email/components';
import * as React from 'react';

export const EmailHeader = () => {
  return (
    <Section style={headerContainer}>
      <Img
        src="https://jamia.app/logo.png"
        width="120"
        alt="Jamia"
        style={logo}
      />
    </Section>
  );
};

const headerContainer = {
  paddingTop: '20px',
  paddingBottom: '20px',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
  display: 'block',
};
