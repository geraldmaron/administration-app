import { counselOnReply, type Campaign, type ConversationScript, type ReplyProjection } from "@admin/engine";
import { counselSentence } from "@admin/player-core";
import { Icon, Portrait } from "@admin/ui-web";
import { faceOf } from "../media/faces";

/**
 * What the cabinet says about the answer picked: the chair whose call it is,
 * and a second voice exactly when the engine finds one. Composed only from
 * what the engine returned; a vacant chair says so.
 */
export function Counsel({ campaign, script, reply }: { readonly campaign: Campaign; readonly script: ConversationScript; readonly reply: ReplyProjection }) {
  const counsel = counselOnReply(campaign, script, reply);
  if (!counsel) return null;
  if (counsel.kind === "vacant") return <p className="counsel counsel--vacant">The seat that would advise you on this is empty right now.</p>;
  const sentence = counselSentence(campaign, script, reply);
  if (!sentence) return null;
  const voices = [
    { key: "lead", person: sentence.speaker, line: sentence.line, label: "Your adviser" },
    ...(sentence.dissent ? [{ key: "dissent", person: sentence.dissent.speaker, line: sentence.dissent.line, label: "A different view" }] : []),
  ];
  return (
    <section className="counsel" aria-labelledby="decision-counsel">
      <h3 id="decision-counsel" className="situation__label">
        <Icon name="microphone" size={18} /> What your advisers say about the answer picked
      </h3>
      <ul className="counsel__voices">
        {voices.map((voice) => {
          const face = faceOf(campaign, voice.person);
          return (
            <li key={voice.key} className="counsel__voice" data-voice={voice.key}>
              <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="md" decorative />
              <div>
                <p className="counsel__who">
                  <span className="counsel__label">{voice.label}</span> {face.name}
                </p>
                <p className="counsel__line">{voice.line}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
