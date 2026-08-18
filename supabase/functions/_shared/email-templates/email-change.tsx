/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, styles } from './layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout preview="Confirm your OffMeta email change">
    <Heading style={styles.heading}>Confirm your new email</Heading>
    <Text style={styles.text}>
      Confirm the change of your OffMeta email from {oldEmail} to {newEmail}.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Confirm change
    </Button>
    <Text style={styles.note}>
      This link expires shortly and can only be used once. If you didn't request
      this change, reset your password to secure your account.
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail
