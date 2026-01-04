import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquarePlus, Loader2 } from 'lucide-react';

interface SearchFeedbackProps {
  originalQuery: string;
  translatedQuery?: string;
}

export function SearchFeedback({ originalQuery, translatedQuery }: SearchFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerProcessing = async () => {
    try {
      // Trigger the process-feedback function in the background
      await supabase.functions.invoke('process-feedback', {
        body: {}
      });
    } catch (error) {
      // Silently fail - processing is async and will be retried
      console.log('Background processing triggered');
    }
  };

  const handleSubmit = async () => {
    if (!issue.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('search_feedback').insert({
        original_query: originalQuery,
        translated_query: translatedQuery || null,
        issue_description: issue.trim(),
      });

      if (error) throw error;

      toast.success('Feedback submitted', {
        description: 'Thanks! We\'ll use this to improve searches.'
      });
      setOpen(false);
      setIssue('');

      // Trigger background processing
      triggerProcessing();
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
          title="Report search issue"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Search Issue</DialogTitle>
          <DialogDescription>
            Help us improve by describing what went wrong with your search.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">Your search:</p>
            <p className="font-medium text-foreground">{originalQuery || 'No search yet'}</p>
          </div>
          {translatedQuery && (
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">Translated to:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {translatedQuery}
              </code>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="issue" className="text-sm font-medium">
              What went wrong?
            </label>
            <Textarea
              id="issue"
              placeholder="e.g., Didn't find cards that give haste like Agatha..."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !issue.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
