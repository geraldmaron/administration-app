import { withCausalMarks, markedFlags, type Campaign, type EffectPacket } from "@admin/engine";
import { boundPlace } from "./scenario-text.js";
import { renderText } from "./scenario-text.js";
import { classStagedFlag, scenarioAnsweredFlag, scenarioFiredFlag, severityStagedFlag } from "./scenario.js";
import { deskClosedFlag } from "./desk-window.js";
import { familyEffects } from "./scenario-memory.js";
import { storyPlace } from "./scenario-locus.js";
import { scenarioAnswerEffect } from "./scenario-case-effect.js";
import type { CastScenario } from "./scenario-cast.js";
import { scenarioOccurrenceKey } from "./scenario-occurrence.js";

// --- Memory ---

/**
 * Stamp what a committed reply means onto the campaign: the fired flag that
 * `once` gates on, the closed desk, whatever the reply says this answer made
 * the player — and, for answers big enough to make news, the headline.
 */
export function rememberReply(
  campaign: Campaign,
  packet: EffectPacket,
  cast: CastScenario,
  replyId: string,
): EffectPacket {
  const reply = cast.def.replies.find((candidate) => candidate.id === replyId);
  // The staged-class flag is what the director reads back to know what the
  // player has recently been shown. Stamped here, with the rest of the reply's
  // memory, so a scenario only counts as seen once it was actually answered —
  // a candidate that was ranked and not drawn has not been shown to anybody.
  // Each authored flag is stamped twice: the flag itself, which is *that* the
  // deed happened, and a turn-stamped marker, which is *when* — the half an
  // `agedAtLeast` follow-up needs to tell a callback from a next-week script.
  const authored = reply?.sets ?? [];
  const durable = [
    scenarioFiredFlag(cast.def.id),
    ...(reply ? [scenarioAnsweredFlag(cast.def.id, reply.id)] : []),
    ...authored,
  ];
  const set = [
    ...markedFlags(durable, packet.turn),
    // These three carry their own turn in the key, so a marker beside them
    // would only be a second copy of it.
    classStagedFlag(cast.def.class, packet.turn),
    severityStagedFlag(cast.def.severity, packet.turn),
    deskClosedFlag(packet.turn),
  ];
  const press = reply?.press && !cast.report && (!cast.matter || cast.matter.public)
    ? [
        {
          kind: "feed" as const,
          items: [
            {
              turn: packet.turn,
              kind: "press" as const,
              visibility: "public" as const,
              headline: renderText(campaign, cast.counterpart, reply.press, boundPlace(campaign, cast.def, cast.counterpart, cast.locus, cast.script.subjects)),
            },
          ],
        },
      ]
    : [];
  // A position with no authored `press` — nine replies in ten — committed no
  // feed item at all, so nothing about a scenario the President spent the week
  // answering ever reached `campaign.feed`. That is what left the desk's own
  // held wire slots (`brief.ts`'s `ADMINISTRATION_SLOTS`) unable to pick up a
  // real decision organically: they filled only from a signed order or a rare
  // authored headline above. The scenario's own subject, already rendered onto
  // the cast, is what ran — distinct on purpose from `packet.narration.summary`
  // ("what the country remembers", read back by the conversation's own
  // aftermath ceremony), so the two do not print the same sentence under two
  // different labels.
  //
  // The President is the one who acted, so the item says so; and a scenario at
  // home names no foreign party, so it carries no target rather than the
  // player's own nation standing in as one — which is what made the composer
  // read a school board dispute as a move aimed at this government.
  const home = cast.counterpart === campaign.founding.nation;
  const record = cast.matter && !cast.matter.public ? [] : [
    {
      kind: "feed" as const,
      items: [
        {
          turn: packet.turn,
          kind: "player-action" as const,
          visibility: cast.report ? "intelligence" as const : "public" as const,
          headline: cast.script.subject,
          actor: campaign.founding.nation,
          ...(home ? {} : { target: cast.counterpart }),
        },
      ],
    },
  ];
  // The arc ledger's own entry. Stamped here rather than at the draw for the
  // same reason the staged-class flag is: a scenario that was ranked and not
  // answered has happened to nobody, and a family that opened on it would pin
  // a country the president was never actually asked about.
  // Where this happened rides with the arc and with the flags the answer set,
  // so the story's next scene comes back to the same town rather than drawing
  // one of its own.
  const place = storyPlace(cast.locus, campaign.founding.nation);
  const family = familyEffects(cast, packet.turn, replyId, place);
  const callback = authored.length > 0
    ? [{ kind: "scenarioFamily" as const, callback: { flags: authored, ...(place ? { place } : {}) } }]
    : [];
  const answered = scenarioAnswerEffect(campaign, scenarioOccurrenceKey(cast), replyId);
  return withCausalMarks({
    ...packet,
    effects: [...packet.effects, { kind: "flag", set }, ...family, ...callback, ...press, ...record, ...(answered ? [answered] : [])],
  });
}
