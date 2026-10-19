import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, HelpTip, Icon } from "@admin/ui-web";
import { AUTHORITIES, type AuthorityTopic } from "./authorities";
import "./authority-help.css";

/** The same contextual legal reference follows a task from overview to authorization. */
export function AuthorityHelp({ topic, compact = false }: { readonly topic: AuthorityTopic; readonly compact?: boolean }) {
  const entry = AUTHORITIES[topic];
  return <div className="authority-help" data-compact={compact || undefined}>
    <span className="authority-help__identity"><Icon name="gavel" size={16} /><span>{entry.basis}</span></span>
    <HelpTip label={`Authority: ${entry.title}`} more={{ title: entry.title, body: <div className="authority-reference">
      <Card><CardHeader><CardTitle>{entry.basis}</CardTitle><CardDescription>{entry.summary}</CardDescription></CardHeader><CardContent>
      <section><h3>Limits and conditions</h3><p>{entry.limits}</p></section>
      <section><h3>In this simulation</h3><p>{entry.model}</p></section>
      </CardContent><CardFooter><nav aria-label={`Primary sources for ${entry.title}`}>{entry.sources.map((source) => <Button key={source.url} asChild kind="secondary" size="sm"><a href={source.url} target="_blank" rel="noreferrer">{source.label}<Icon name="dossier" size={14} /></a></Button>)}</nav></CardFooter></Card>
      <p className="authority-reference__source">Sources checked October 15, 2026. Statutory references use the published 2024 U.S. Code edition; later amendments are not represented as verified here.</p>
    </div> }}><p>{entry.summary}</p><p>{entry.limits}</p></HelpTip>
  </div>;
}
