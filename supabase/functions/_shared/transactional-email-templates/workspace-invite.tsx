/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Onetrace AI'

interface WorkspaceInviteProps {
  workspaceName?: string
  inviterName?: string
  inviterEmail?: string
  role?: string
  acceptUrl?: string
  isNewUser?: boolean
}

const WorkspaceInviteEmail = ({
  workspaceName = 'a workspace',
  inviterName,
  inviterEmail,
  role = 'MEMBER',
  acceptUrl = '#',
  isNewUser = false,
}: WorkspaceInviteProps) => {
  const inviter = inviterName || inviterEmail || 'A team member'
  const ctaLabel = isNewUser ? 'Accept & create account' : 'Accept invitation'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {inviter} invited you to join {workspaceName} on {SITE_NAME}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You've been invited to {workspaceName}</Heading>
          <Text style={text}>
            <strong>{inviter}</strong>
            {inviterEmail && inviterName ? ` (${inviterEmail})` : ''} has
            invited you to join the <strong>{workspaceName}</strong> workspace
            on {SITE_NAME} as a <strong>{role}</strong>.
          </Text>
          {isNewUser && (
            <Text style={text}>
              Since you don't have an account yet, accepting will let you
              create one in seconds and jump straight into the workspace.
            </Text>
          )}
          <Section style={buttonContainer}>
            <Button href={acceptUrl} style={button}>
              {ctaLabel}
            </Button>
          </Section>
          <Text style={smallText}>
            Or copy and paste this link into your browser:
            <br />
            <a href={acceptUrl} style={link}>
              {acceptUrl}
            </a>
          </Text>
          <Text style={footer}>
            If you weren't expecting this invitation, you can safely ignore
            this email. The link expires in 7 days.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WorkspaceInviteEmail,
  subject: (data: Record<string, any>) =>
    `You're invited to ${data?.workspaceName ?? 'a workspace'} on ${SITE_NAME}`,
  displayName: 'Workspace invitation',
  previewData: {
    workspaceName: 'Keva AI',
    inviterName: 'Sam',
    inviterEmail: 'sam@onetrace.ai',
    role: 'MEMBER',
    acceptUrl: 'https://onetrace.ai/invite/accept?token=sample-token',
    isNewUser: false,
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container: React.CSSProperties = {
  padding: '32px 28px',
  maxWidth: '560px',
  margin: '0 auto',
}
const h1: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#0a0a0a',
  margin: '0 0 20px',
}
const text: React.CSSProperties = {
  fontSize: '15px',
  color: '#333333',
  lineHeight: '1.55',
  margin: '0 0 18px',
}
const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '28px 0',
}
const button: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 600,
  display: 'inline-block',
}
const smallText: React.CSSProperties = {
  fontSize: '12px',
  color: '#777777',
  lineHeight: '1.5',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
}
const link: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'underline',
}
const footer: React.CSSProperties = {
  fontSize: '12px',
  color: '#999999',
  margin: '32px 0 0',
  borderTop: '1px solid #eeeeee',
  paddingTop: '16px',
}
