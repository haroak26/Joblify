import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { getCsrfToken } from '@/lib/queryClient';

interface AISupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISupportDialog({ open, onOpenChange }: AISupportDialogProps) {
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmitQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    analytics.trackSupportQuestionAsked(question);

    try {
      const csrfToken = getCsrfToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      const response = await fetch('/api/support/ai-assist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      
      if (data.answer) {
        setAiResponse(data.answer);
      } else {
        // If AI can't answer, proceed directly to support
        handleProceedToSupport();
      }
    } catch (error) {
      console.error('Error getting AI support:', error);
      handleProceedToSupport();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAnswer = () => {
    analytics.trackAISupportAnswerAccepted('question-id');
    setAiResponse(null);
    setQuestion('');
    onOpenChange(false);
  };

  const handleProceedToSupport = () => {
    analytics.trackSupportTicketCreated('question-id');
    
    // Open Zendesk widget with pre-filled question
    if (window.zE) {
      window.zE('webWidget', 'open');
      window.zE('webWidget', 'prefill', {
        message: {
          value: aiResponse
            ? `My question: ${question}\n\nAI suggested: ${aiResponse}\n\nI need further assistance.`
            : question,
        },
      });
    }
    
    setAiResponse(null);
    setQuestion('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setAiResponse(null);
    setQuestion('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Get Help
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {aiResponse
              ? 'Here\'s what we found. Does this answer your question?'
              : 'Describe your question and our AI will try to help you instantly.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!aiResponse ? (
            <div className="space-y-4">
              <Textarea
                placeholder="What can we help you with? (e.g., How do I export my resume as a PDF? How do I upgrade my plan?)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                className="resize-none text-sm"
              />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Our AI will check our knowledge base and try to answer your question immediately.
              </p>
            </div>
          ) : (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex gap-2 sm:gap-3">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-xs sm:text-sm">AI Assistant:</p>
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{aiResponse}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!aiResponse ? (
            <>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto text-sm">
                Cancel
              </Button>
              <Button onClick={handleSubmitQuestion} disabled={loading || !question.trim()} className="w-full sm:w-auto text-sm">
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Get AI Help
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleAcceptAnswer} className="w-full sm:w-auto text-sm">
                This Helped!
              </Button>
              <Button onClick={handleProceedToSupport} className="w-full sm:w-auto text-sm">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Contact Support
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
