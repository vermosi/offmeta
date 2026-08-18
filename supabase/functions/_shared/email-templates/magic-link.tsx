/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, styles } from './layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout preview="Your OffMeta login link">
    <Heading style={styles.heading}>Log in to OffMeta</Heading>
    <Text style={styles.text}>
      Use the link below to sign in — no password needed.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Log in
    </Button>
    <Text style={styles.note}>
      This link expires shortly and can only be used once. If you didn't request
      it, you can ignore this email.
    </Text>
  </EmailLayout>
)

export default MagicLinkEmail
