import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2, Lock, RefreshCw, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DRIZZLE_STUDIO_APP_URL,
  DRIZZLE_STUDIO_TUNNEL_COMMAND,
  probeDrizzleStudio,
  type StudioConnection,
} from '../drizzleStudioModel';

const EngineeringDrizzleStudioTab = () => {
  const [connection, setConnection] = useState<StudioConnection>('checking');
  const [copied, setCopied] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    probeDrizzleStudio().then((reachable) => {
      if (active) setConnection(reachable ? 'connected' : 'offline');
    });
    return () => { active = false; };
  }, [attempt]);

  const check = () => { setConnection('checking'); setAttempt((value) => value + 1); };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(DRIZZLE_STUDIO_TUNNEL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked; the command stays visible to copy by hand */ }
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
      <span className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4" />Drizzle Studio · full read and write access · reachable only through your SSH tunnel</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={check} disabled={connection === 'checking'}><RefreshCw className="mr-2 h-4 w-4" />Reconnect</Button>
        {connection === 'connected' && <Button variant="outline" size="sm" asChild><a href={DRIZZLE_STUDIO_APP_URL} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open in new tab</a></Button>}
      </div>
    </div>

    {connection === 'checking' && <div className="flex h-64 items-center justify-center rounded-lg border"><Loader2 className="h-6 w-6 animate-spin" /></div>}

    {connection === 'connected' && <iframe
      title="Drizzle Studio"
      src={DRIZZLE_STUDIO_APP_URL}
      allow="local-network-access; local-network; loopback-network; clipboard-write"
      className="h-[calc(100vh-260px)] min-h-[600px] w-full rounded-lg border bg-background"
    />}

    {connection === 'offline' && <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Terminal className="h-4 w-4" />Connect to Drizzle Studio</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Drizzle Studio runs on the server and is never exposed to the internet. Open a tunnel from this computer to use it here:</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Run this in a terminal and leave it open. Replace <code>YOUR-SERVER</code> with the server address, and if you sign in with a key file add <code>-i path/to/key.pem</code> after <code>ssh</code>:
            <div className="mt-2 flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100">
              <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{DRIZZLE_STUDIO_TUNNEL_COMMAND}</span>
              <Button variant="ghost" size="icon" aria-label="Copy command" className="h-7 w-7 text-slate-100 hover:bg-slate-800" onClick={copyCommand}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            {copied && <span className="text-xs text-emerald-600">Copied</span>}
          </li>
          <li>Press <b>Reconnect</b>.</li>
        </ol>
        <p className="text-muted-foreground">Use Chrome or Firefox. Safari blocks the connection to localhost. In Chrome, if it still cannot connect, click the icon left of the address bar → Site settings → set <b>Apps on device</b> (Local network access) to Allow, then Reconnect.</p>
      </CardContent>
    </Card>}
  </div>;
};

export default EngineeringDrizzleStudioTab;
