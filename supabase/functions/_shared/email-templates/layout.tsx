/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const SITE_URL = 'https://offmeta.app'
const LOGO_URL = `${SITE_URL}/offmeta-logo.png`

export const colors = {
  ink: '#130F24',
  body: '#33313F',
  muted: '#6b6880',
  violet: '#652BB6',
  border: '#e6e4ee',
  surface: '#ffffff',
  page: '#f6f5fa',
}

export const styles = {
  main: {
    backgroundColor: colors.page,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    margin: '0',
    padding: '32px 0',
  },
  container: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    maxWidth: '480px',
    margin: '0 auto',
    padding: '32px',
  },
  logo: { display: 'block', margin: '0 0 28px' },
  heading: {
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: colors.ink,
    lineHeight: '1.4',
    margin: '0 0 12px',
  },
  text: {
    fontSize: '14px',
    color: colors.body,
    lineHeight: '1.6',
    margin: '0 0 24px',
  },
  button: {
    backgroundColor: colors.violet,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    borderRadius: '8px',
    padding: '12px 22px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  code: {
    fontFamily: 'Courier, monospace',
    fontSize: '26px',
    letterSpacing: '4px',
    fontWeight: 'bold' as const,
    color: colors.ink,
    backgroundColor: colors.page,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '14px 18px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  note: {
    fontSize: '13px',
    color: colors.muted,
    lineHeight: '1.6',
    margin: '24px 0 0',
  },
  hr: {
    borderColor: colors.border,
    margin: '28px 0 16px',
  },
  footer: {
    fontSize: '12px',
    color: colors.muted,
    lineHeight: '1.6',
    margin: '0',
  },
  link: { color: colors.muted, textDecoration: 'underline' },
}

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

/**
 * Shared shell for every auth email:
 * logo -> content -> divider -> minimal footer.
 */
export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img
          src={LOGO_URL}
          width="112"
          height="28"
          alt="OffMeta"
          style={styles.logo}
        />
        <Section>{children}</Section>
        <Hr style={styles.hr} />
        <Text style={styles.footer}>
          OffMeta — Magic: The Gathering card search in plain English.{' '}
          <Link href={SITE_URL} style={styles.link}>
            offmeta.app
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailLayout
