import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface InvoiceEmailProps {
  invoiceId: string;
  customerEmail: string;
  date: string;
  description: string;
  credits: number;
  amount: string;
  status: string;
  paymentId?: string;
}

export const InvoiceEmail = ({
  invoiceId,
  customerEmail,
  date,
  description,
  credits,
  amount,
  status,
  paymentId,
}: InvoiceEmailProps) => (
  <Html>
    <Head />
    <Preview>Your invoice from Artie AI - {invoiceId}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Invoice</Heading>
        
        <Section style={invoiceDetails}>
          <Text style={detailText}>
            <strong>Invoice #:</strong> {invoiceId}
          </Text>
          <Text style={detailText}>
            <strong>Date:</strong> {date}
          </Text>
          <Text style={detailText}>
            <strong>Status:</strong> {status.toUpperCase()}
          </Text>
        </Section>

        <Hr style={hr} />

        <Section>
          <Heading as="h2" style={h2}>Bill To</Heading>
          <Text style={text}>{customerEmail}</Text>
        </Section>

        <Hr style={hr} />

        <Section>
          <Heading as="h2" style={h2}>Transaction Details</Heading>
          
          <table style={table}>
            <thead>
              <tr style={tableHeader}>
                <th style={tableHeaderCell}>Description</th>
                <th style={tableHeaderCell}>Credits</th>
                <th style={tableHeaderCell}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={tableRow}>
                <td style={tableCell}>{description}</td>
                <td style={tableCell}>{credits}</td>
                <td style={tableCell}>{amount}</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Hr style={hr} />

        <Section style={totalSection}>
          <Row>
            <Column align="right">
              <Text style={totalLabel}>Total:</Text>
            </Column>
            <Column align="right" style={{ width: '30%' }}>
              <Text style={totalAmount}>{amount}</Text>
            </Column>
          </Row>
        </Section>

        {paymentId && (
          <Section>
            <Text style={footerText}>Payment ID: {paymentId}</Text>
          </Section>
        )}

        <Hr style={hr} />

        <Section>
          <Text style={footerText}>
            Thank you for your business!
          </Text>
          <Text style={footerText}>
            If you have any questions about this invoice, please contact our support team.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default InvoiceEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#3b82f6',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 12px',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 48px',
};

const detailText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const invoiceDetails = {
  padding: '0 48px',
  marginBottom: '24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const table = {
  width: '100%',
  margin: '0 48px',
  borderCollapse: 'collapse' as const,
};

const tableHeader = {
  backgroundColor: '#f6f9fc',
};

const tableHeaderCell = {
  padding: '12px',
  textAlign: 'left' as const,
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#333',
  borderBottom: '2px solid #e6ebf1',
};

const tableRow = {
  borderBottom: '1px solid #e6ebf1',
};

const tableCell = {
  padding: '12px',
  fontSize: '14px',
  color: '#666',
};

const totalSection = {
  padding: '0 48px',
  marginTop: '24px',
};

const totalLabel = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0',
};

const totalAmount = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#3b82f6',
  margin: '0',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
  margin: '8px 0',
};
