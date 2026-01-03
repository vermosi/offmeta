import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VoiceSearchButtonProps {
  isListening: boolean;
  isSupported: boolean;
  isProcessing?: boolean;
  onToggle: () => void;
  className?: string;
}

export function VoiceSearchButton({
  isListening,
  isSupported,
  isProcessing = false,
  onToggle,
  className
}: VoiceSearchButtonProps) {
  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled
              aria-label="Voice input not supported"
              className={cn("h-12 w-12 rounded-full opacity-50", className)}
            >
              <MicOff className="h-5 w-5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voice input not supported in this browser</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={onToggle}
            disabled={isProcessing}
            aria-label={isListening ? "Stop listening" : "Start voice search"}
            className={cn(
              "h-12 w-12 rounded-full relative transition-all duration-300",
              isListening && "bg-destructive hover:bg-destructive/90 animate-pulse-ring",
              className
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isListening ? (
              <Mic className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            
            {/* Animated rings when listening */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping-slow bg-destructive/30" />
                <span className="absolute inset-[-4px] rounded-full border-2 border-destructive/40 animate-pulse" />
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isListening ? 'Stop listening' : 'Start voice search'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
