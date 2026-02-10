import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';

interface EmailFooterProps {
  unsubscribeToken: string;
  frontendBaseUrl: string;
}

export const EmailFooter = ({
  unsubscribeToken,
  frontendBaseUrl,
}: EmailFooterProps) => {
  return (
    <Section style={footerContainer}>
      <Hr style={divider} />
      <Text style={footerText}>
        Ricevi questa email perche sei iscritto a Jamia.
      </Text>
      <Text style={footerLinks}>
        <Link
          href={`${frontendBaseUrl}/unsubscribe?token=${unsubscribeToken}`}
          style={link}
        >
          Annulla iscrizione
        </Link>
        {' • '}
        <Link href={`${frontendBaseUrl}/profile`} style={link}>
          Gestisci preferenze
        </Link>
      </Text>
    </Section>
  );
};

const footerContainer = {
  paddingTop: '32px',
  paddingBottom: '24px',
};

const divider = {
  borderColor: '#e5e7eb',
  marginBottom: '16px',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6b7280',
  textAlign: 'center' as const,
  marginBottom: '8px',
};

const footerLinks = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6b7280',
  textAlign: 'center' as const,
  marginTop: '0',
};

const link = {
  color: '#6b7280',
  textDecoration: 'underline',
};
