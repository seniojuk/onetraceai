/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change your email address for {siteName} from{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>
            {oldEmail}
          </Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Click the button below to confirm this change:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm email change
        </Button>
        <Text style={footer}>
          If you didn't request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.55',
  margin: '0 0 20px',
}
const link = { color: '#0d9488', textDecoration: 'underline' }
const button = {
  backgroundColor: '#131e3d',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '10px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '32px 0 0',
  borderTop: '1px solid #eeeeee',
  paddingTop: '16px',
}
