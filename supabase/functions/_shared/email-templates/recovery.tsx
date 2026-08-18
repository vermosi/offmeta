/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, styles } from './layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout preview="Reset your OffMeta password">
    <Heading style={styles.heading}>Reset your password</Heading>
    <Text style={styles.text}>
      Choose a new password for your OffMeta account.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Reset password
    </Button>
    <Text style={styles.note}>
      This link expires shortly and can only be used once. If you didn't request
      a reset, ignore this email — your password stays the same.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail
