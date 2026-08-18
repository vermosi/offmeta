/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, styles } from './layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <EmailLayout preview="Confirm your email for OffMeta">
    <Heading style={styles.heading}>Confirm your email</Heading>
    <Text style={styles.text}>
      Confirm {recipient} to finish setting up your OffMeta account and save
      cards and searches.
    </Text>
    <Button style={styles.button} href={confirmationUrl}>
      Confirm email
    </Button>
    <Text style={styles.note}>
      This link expires shortly and can only be used once. If you didn't create
      an account, you can ignore this email.
    </Text>
  </EmailLayout>
)

export default SignupEmail
