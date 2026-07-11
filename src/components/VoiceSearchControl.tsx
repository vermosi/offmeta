/**
 * Self-contained voice search control.
 * Kept in a separate lazy chunk so Web Speech support code is not part of the
 * homepage's initial JavaScript payload.
 */

import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceSearchButton } from '@/components/VoiceSearchButton';

interface VoiceSearchControlProps {
  className?: string;
  onFinalTranscript: (transcript: string) => void;
  onTranscript?: (transcript: string) => void;
}

export function VoiceSearchControl({
  className,
  onFinalTranscript,
  onTranscript,
}: VoiceSearchControlProps) {
  const { isListening, isSupported, startListening, stopListening } =
    useVoiceInput({
      onFinalTranscript,
      onTranscript,
    });

  if (!isSupported) return null;

  return (
    <VoiceSearchButton
      isListening={isListening}
      isSupported={isSupported}
      onToggle={isListening ? stopListening : startListening}
      className={className}
    />
  );
}
