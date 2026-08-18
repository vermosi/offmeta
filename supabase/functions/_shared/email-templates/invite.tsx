/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, styles } from './layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <EmailLayout preview="You've been invited to OffMeta">
    <Heading style={styles.heading}>You've been invited to OffMeta</Heading>
    <Text style={styles.text}>
      Accept the invitation to create your account and start searching Magic
      cards in plain English.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Accept invitation
    </Button>
    <Text style={styles.note}>
      This invitation expires shortly. If you weren't expecting it, you can
      ignore this email.
    </Text>
  </EmailLayout>
)

export default InviteEmail
