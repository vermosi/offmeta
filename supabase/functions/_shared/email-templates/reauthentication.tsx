/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Heading, Text } from 'npm:@react-email/components@0.0.22'

import { EmailLayout, styles } from './layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout preview="Your OffMeta verification code">
    <Heading style={styles.heading}>Confirm it's you</Heading>
    <Text style={styles.text}>
      Enter this code in OffMeta to confirm your identity.
    </Text>
    <Text style={styles.code}>{token}</Text>
    <Text style={styles.note}>
      This code expires shortly. If you didn't request it, you can ignore this
      email.
    </Text>
  </EmailLayout>
)

export default ReauthenticationEmail
