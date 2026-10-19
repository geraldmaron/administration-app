import { Card } from "@admin/ui-web";
import type { ReactNode } from "react";
import type { CommandCard } from "@admin/player-core";
import { POSTURE_WORDS } from "@admin/player-core";
import { Bar, BarRows, Icon, type BarTone } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { PanelHeading, Segments, StatusChip } from "./parts";

const POSTURE_TONE = { routine: "good", heightened: "watch", surge: "bad" } as const;

/** Formations assigned, who it stands against or toward, and each service's share of its own force sent here (not parts of one whole, so each is its own bar). */
export function CommandFacts({ card, rows = true }: { readonly card: CommandCard; readonly rows?: boolean }) {
  const { against, toward } = card.engagedWith;
  return (
    <>
      <p className="command__chips">
        <span className="command__chip">
          <Icon name="unitGroundFormation" size={14} /> {card.formations} {card.formations === 1 ? "formation" : "formations"}
        </span>
        {against > 0 ? (
          <span className="command__chip" data-engaged="true">
            <Icon name="conflict" size={14} /> Against {against} {against === 1 ? "government" : "governments"}
          </span>
        ) : null}
        {toward > 0 ? (
          <span className="command__chip">
            <Icon name="shield" size={14} /> Committed toward {toward}
          </span>
        ) : null}
      </p>
      {rows && card.assignment.length > 0 ? (
        <BarRows
          label={`${card.abbr}: share of each service's force assigned here`}
          labelWidth="6rem"
          slim
          rows={card.assignment.map((row) => ({ id: row.branch, label: row.label, value: row.share, figure: `${Math.round(row.share * 100)}%`, tone: "reading" as const }))}
        />
      ) : null}
    </>
  );
}

function chainTone(chain: number): BarTone {
  return chain < 0.7 ? "bad" : chain < 0.9 ? "watch" : "good";
}

function Reading({ label, bar, figure }: { readonly label: string; readonly bar: ReactNode; readonly figure: string }) {
  return (
    <div className="sec-cmd__reading">
      <span>{label}</span>
      {bar}
      <strong>{figure}</strong>
    </div>
  );
}

function CommandTile({ card }: { readonly card: CommandCard }) {
  const placed = card.hasArea ? (card.places === 0 ? "None placed" : `${card.places} ${card.places === 1 ? "place" : "places"}`) : undefined;
  return (
    <li className="sec-cmd ui-card-door" data-posture={card.effective} data-engaged={card.engaged ? "true" : undefined}>
      <p className="sec-cmd__head">
        <Door href={card.href} className="sec-cmd__name ui-card-door__link">
          {card.abbr}
        </Door>
        <StatusChip tone={POSTURE_TONE[card.effective]}>
          {POSTURE_WORDS[card.effective]}
          {card.effective !== card.ordered ? " (held)" : ""}
        </StatusChip>
      </p>
      <p className="sec-cmd__commander">{card.commander ? `${card.commander.name}${card.commander.acting ? ", acting" : ""}, ${card.commander.service}` : "No commander"}</p>
      <Reading label="Order carried out" bar={<Bar value={card.chain} tone={chainTone(card.chain)} slim />} figure={`${Math.round(card.chain * 100)}%`} />
      {placed ? <Reading label="Forces abroad" bar={<Bar value={card.weight} tone="reading" slim />} figure={placed} /> : null}
      <CommandFacts card={card} rows={false} />
    </li>
  );
}

function Grid({ label, cards }: { readonly label: string; readonly cards: readonly CommandCard[] }) {
  return (
    <ul className="sec-cmds" aria-label={label}>
      {cards.map((card) => (
        <CommandTile key={card.id} card={card} />
      ))}
    </ul>
  );
}

/** The geographic commands and the functional ones, each a whole-tile door to its page, with the order's reach and the forces it holds drawn. */
export function Commands({ commands, functional, areaMap }: { readonly commands: readonly CommandCard[]; readonly functional: readonly CommandCard[]; /** The shared map, set under the command grid. */ readonly areaMap?: ReactNode }) {
  const all = [...commands, ...functional];
  const count = (posture: CommandCard["effective"]) => all.filter((card) => card.effective === posture).length;
  return (
    <Card role="region" className="sec-panel" aria-labelledby="security-commands">
      <PanelHeading id="security-commands" icon="shield">
        Commands
      </PanelHeading>
      <div className="sec-cmds__summary">
        <Segments
          label="Commands by posture"
          parts={[
            { key: "bad", count: count("surge"), word: "at surge" },
            { key: "watch", count: count("heightened"), word: "heightened" },
            { key: "good", count: count("routine"), word: "routine" },
          ]}
        />
        <p className="sec__note">
          {count("surge")} surge, {count("heightened")} heightened, {count("routine")} routine. A geographic command holds the countries and seas the Unified Command Plan gives it today.
        </p>
      </div>
      {areaMap}
      <Grid label="Geographic commands" cards={commands} />
      <h3 className="sec__subheading">Functional commands</h3>
      <Grid label="Functional commands" cards={functional} />
    </Card>
  );
}
