// The share link control on a test's detail page.
//
// Creating a link and replacing one are the same action, because minting always
// writes a fresh token: pressing Replace is how a teacher kills a link that has
// been forwarded somewhere it should not have gone. The caution below is part of
// the control rather than documentation somewhere else, because the moment a
// teacher decides to share is the moment they need to know what a share link
// does and does not prove.

import { useState } from 'react';
import { Check, Copy, Link2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionPanel } from '@/components/common/SectionPanel';
import { testShareApi } from '../api/testShareApi';

export const buildShareUrl = (token: string, origin: string) => `${origin}/#/share/tests/${token}`;

interface ShareTestPanelProps {
  testId: number;
  shareToken: string | null;
  onTokenChange: (token: string | null) => void;
}

export const ShareTestPanel = ({ testId, shareToken, onTokenChange }: ShareTestPanelProps) => {
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const shareUrl = shareToken ? buildShareUrl(shareToken, window.location.origin) : '';

  const mint = async () => {
    setWorking(true);
    setError('');
    try {
      const payload = await testShareApi.create(testId);
      onTokenChange(payload.share_token);
    } catch {
      setError('Could not create the link. Try again.');
    } finally {
      setWorking(false);
    }
  };

  const revoke = async () => {
    setWorking(true);
    setError('');
    try {
      await testShareApi.revoke(testId);
      onTokenChange(null);
    } catch {
      setError('Could not turn the link off. Try again.');
    } finally {
      setWorking(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the address and copy it by hand.');
    }
  };

  return (
    <SectionPanel
      title="Share link"
      description="Let a student open this test without signing in. They enter their username to start."
    >
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {shareToken ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id={`share-url-${testId}`} readOnly value={shareUrl} className="font-mono text-xs" />
            <Button variant="outline" onClick={copy} className="shrink-0">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={mint} disabled={working}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Replace link
            </Button>
            <Button variant="ghost" size="sm" onClick={revoke} disabled={working}>
              <Trash2 className="mr-2 h-4 w-4" />
              Turn off
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Replacing the link stops the old one working immediately. Only students this test is assigned to can
            start it, but a username identifies a student rather than proving who is at the keyboard, so use share
            links for practice rather than for a test that decides a grade.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Button onClick={mint} disabled={working}>
            <Link2 className="mr-2 h-4 w-4" />
            Create share link
          </Button>
          <p className="text-xs text-muted-foreground">
            Anyone with the link can open the test cover, but only a student it has been assigned to can start it.
          </p>
        </div>
      )}
    </SectionPanel>
  );
};

export default ShareTestPanel;
