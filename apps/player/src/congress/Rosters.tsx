import { useMemo, useState } from "react";
import { campaignDay, committeeName, usPartyWord, type Campaign, type UsParty } from "@admin/engine";
import { appropriationReading, delegationReading, extensionNotices, formatDate, place, sealFor, warPowersReading, type DelegationReading } from "@admin/player-core";
import { STATE_IDS } from "@admin/world";
import { Tag, Button, CalendarPaper, Card, CardLink, Column, Empty, markKeyEntries, Meter, ReadingFrame, Row, Seal, Segmented, Select, Text, TextInput, View } from "@admin/ui";
import { PARTY_INK, VoteCount } from "@admin/ui/legislature";
import { Authority } from "./ActChooser";
import { LAW, senateNominations, type Caucus, type SenateNomination } from "./model";
import { PersonName } from "../dossier/PersonPeek";
import { termDoor } from "../handbook/term-door";
import { moodFrame, voteFrame } from "./mood";
import { STANCE_METER } from "./Record";
import { Note, Paged, RowLink, go } from "./parts";
import { CitedLawHelp } from "../law/LawHelp";

function NominationRow({ campaign, row }: { readonly campaign: Campaign; readonly row: SenateNomination }) {
  return (
    <CardLink label={`Open ${row.name}'s file, nominee for ${row.office}`} href={row.personHref} onPress={() => go(row.personHref)} pad="md">
      <Column gap="sm">
        <Row between wrap gap="sm">
          <Column flex={1} minWidth={200} gap="2xs">
            <PersonName campaign={campaign} id={row.nominee} name={row.name} role={`Nominee for ${row.office}`} />
            <Text variant="caption" tone="secondary">{row.office}</Text>
          </Column>
          <Tag tone={row.vote ? "info" : "pending"} icon={row.vote ? "appoint" : "pending"}>{row.stage}</Tag>
        </Row>
        <Text variant="caption">
          Open for {row.days} {row.days === 1 ? "day" : "days"}.{row.committee ? ` Committee: ${committeeName(row.committee)}.` : ""}
          {row.controversies.length > 0 ? ` Concerns raised: ${row.controversies.join(", ")}.` : ""}
        </Text>
        {row.vote ? <VoteCount name="Senate, to confirm" seats={row.vote.yeas + row.vote.nays} required={row.vote.required} requiredLabel="a majority of those voting" /> : <Note>You haven't sent this name to the Senate yet, so there's no vote scheduled.</Note>}
      </Column>
    </CardLink>
  );
}

/** Nominations in the confirmation process: a name is not an appointment until the Senate has voted. */
export function Nominations({ campaign }: { readonly campaign: Campaign }) {
  const { before, preparing } = senateNominations(campaign, campaignDay(campaign));
  return (
    <Card title="Nominations" icon="appoint" help={<CitedLawHelp title="Senate approval" meaning="You pick people for top government jobs and for federal judgeships, but the Senate has to approve them. Until the Senate votes yes, the person you picked doesn't have the job." cites={[LAW.appointments]} />} actions={<Authority cite={LAW.appointments} compact />}>
      {before.length === 0 && preparing.length === 0 ? <Note>You have no open nominations. Every job that needs Senate approval is either filled or waiting for you to pick someone.</Note> : null}
      {before.length > 0 ? (
        <CalendarPaper
          seal={<Seal spec={sealFor("SEAL-SENATE")} size={56} label="Seal of the United States Senate" />}
          date={formatDate(campaign.calendar)}
          entries={before.map((row) => ({ id: row.id, name: row.name, office: `to be ${row.office}`, status: `${row.committee ? `Referred to the ${committeeName(row.committee)}. ` : ""}${row.stage}.` }))}
        />
      ) : null}
      <ReadingFrame {...voteFrame("Senate votes each nominee needs")}>
        <Column gap="md">
          {before.length > 0 ? <Text variant="label">With the Senate ({before.length})</Text> : null}
          {before.map((row) => <NominationRow key={row.id} campaign={campaign} row={row} />)}
          {preparing.length > 0 ? <Text variant="label">Still being prepared, not sent yet ({preparing.length})</Text> : null}
          {preparing.map((row) => <NominationRow key={row.id} campaign={campaign} row={row} />)}
        </Column>
      </ReadingFrame>
    </Card>
  );
}

type MemberSort = "name" | "seat" | "state" | "party";

/** The voting seats and their current holders, searchable and sortable; each name opens the member's file. */
export function Members({ campaign, caucus, onCaucus }: { readonly campaign: Campaign; readonly caucus: Caucus | undefined; readonly onCaucus: (next: Caucus | undefined) => void }) {
  const [chamber, setChamber] = useState<"all" | "house" | "senate">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MemberSort>("name");
  const members = campaign.congress.members ?? [];
  const all = useMemo(() => members.map((member) => ({ member, name: campaign.people[member.person]?.base.name ?? "Unknown member", stateName: campaign.states[member.state]?.base.name ?? member.state, alive: campaign.people[member.person]?.alive ?? false })), [members, campaign]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const key = (row: (typeof all)[number]) => (sort === "name" ? row.name : sort === "state" ? row.stateName : sort === "party" ? usPartyWord(row.member.party) : `${row.member.chamber === "house" ? "1" : "0"}${row.member.seat}`);
    return all.filter((row) => (chamber === "all" || row.member.chamber === chamber) && (!caucus || row.member.party === caucus) && `${row.name} ${row.stateName} ${row.member.seat} ${usPartyWord(row.member.party)}`.toLowerCase().includes(needle)).sort((a, b) => key(a).localeCompare(key(b)) || a.member.seat.localeCompare(b.member.seat));
  }, [all, caucus, chamber, query, sort]);
  return (
    <Card title="Members of Congress" icon="subjectPerson">
      <Note>{members.length} seats.</Note>
      {caucus ? (
        <Row gap="sm" wrap>
          <Tag tone="info" icon="flag">{`Showing the ${usPartyWord(caucus)} caucus`}</Tag>
          <Button kind="quiet" size="compact" icon="close" onPress={() => onCaucus(undefined)}>Show everyone</Button>
        </Row>
      ) : null}
      <Row wrap gap="md" top>
        <Segmented label="Chamber" options={[{ value: "all", label: "Both" }, { value: "house", label: "House" }, { value: "senate", label: "Senate" }]} value={chamber} onChange={setChamber} />
        <View flex={1} minWidth={220}>
          <TextInput label="Find a member by name, state, seat or party" kind="search" icon="dossier" value={query} onChangeText={setQuery} maxLength={120} placeholder="Name, state, seat or party" />
        </View>
        <Select<MemberSort> label="Sort by" options={[{ value: "name", label: "Name" }, { value: "seat", label: "Chamber and seat" }, { value: "state", label: "State" }, { value: "party", label: "Party" }]} value={sort} onChange={setSort} />
      </Row>
      <Text variant="caption" role="status">{rows.length} matching seats</Text>
      <Paged items={rows} initial={20} noun="members" empty={members.length === 0 ? "This game doesn't have a list of individual members yet." : "No members match these filters."} render={(row) => (
        <RowLink key={row.member.seat} label={`Open ${row.name}'s file, ${row.member.chamber === "house" ? "House" : "Senate"}, ${row.stateName}`} href={place.person(row.member.person)}>
          <Row gap="sm" wrap>
            <View width={10} height={10} borderRadius="pill" backgroundColor={PARTY_INK[row.member.party as UsParty]} />
            <Column flex={2} minWidth={160}>
              <PersonName campaign={campaign} id={row.member.person} name={row.name} />
              {!row.alive ? <Text variant="caption" tone="warning">Died. The seat is empty until someone is chosen.</Text> : null}
            </Column>
            <Text variant="caption" flex={1} minWidth={120}>{row.member.chamber === "house" ? "House" : "Senate"} · {row.member.seat}</Text>
            <Text variant="caption" flex={1} minWidth={100}>{row.stateName}</Text>
            <Text variant="caption" flex={1} minWidth={100}>{usPartyWord(row.member.party)}{row.member.seatClass ? ` · Class ${row.member.seatClass}` : ""}</Text>
          </Row>
        </RowLink>
      )} />
    </Card>
  );
}

type DelegationSort = "house" | "standing" | "name";

function HouseSplit({ reading }: { readonly reading: DelegationReading }) {
  const { house } = reading;
  if (house.seats === 0) return <Text variant="caption" tone="tertiary">No voting member</Text>;
  return (
    <Column gap="2xs" minWidth={140} flex={1}>
      <View height={8} flexDirection="row" borderRadius="chip" overflow="hidden" role="img" aria-label={`${house.democrat} Democrats, ${house.republican} Republicans, ${house.independent} independents of ${house.seats}`}>
        {house.democrat > 0 ? <View flexGrow={house.democrat} flexBasis={0} backgroundColor="partyDem" /> : null}
        {house.independent > 0 ? <View flexGrow={house.independent} flexBasis={0} backgroundColor="partyInd" /> : null}
        {house.republican > 0 ? <View flexGrow={house.republican} flexBasis={0} backgroundColor="partyRep" /> : null}
      </View>
      <Text variant="caption">{`${house.democrat} D, ${house.republican} R${house.independent > 0 ? `, ${house.independent} I` : ""} of ${house.seats}`}</Text>
    </Column>
  );
}

/** Every state's bloc in Congress, ranked: the House split as a bar, the senators, and how the delegation regards the administration against an even 50%. */
export function Delegations({ campaign }: { readonly campaign: Campaign }) {
  const readings = useMemo(() => STATE_IDS.flatMap((id) => delegationReading(campaign, id) ?? []), [campaign]);
  const [sort, setSort] = useState<DelegationSort>("house");
  const rows = useMemo(() => [...readings].sort((a, b) => (sort === "house" ? b.house.seats - a.house.seats : sort === "standing" ? b.standing.value - a.standing.value : 0) || a.name.localeCompare(b.name)), [readings, sort]);
  return (
    <Card title="Each state's members" icon="flag">
      <Segmented<DelegationSort> label="Rank by" options={[{ value: "house", label: "House seats" }, { value: "standing", label: "Mood toward you" }, { value: "name", label: "State" }]} value={sort} onChange={setSort} />
      <ReadingFrame {...moodFrame("How each state's members regard you")}>
      <Paged items={rows} initial={12} noun="delegations" empty="No state's members have taken their seats yet." render={(reading) => (
        <RowLink key={reading.state} label={`Open ${reading.name}`} href={place.state(reading.state)}>
          <Row gap="md" wrap>
            <View minWidth={140} flex={1}>
              <Text variant="label">{reading.name}</Text>
            </View>
            <HouseSplit reading={reading} />
            <Text variant="caption" minWidth={120} flex={1}>{reading.senators.length === 0 ? "No senators" : `Senate: ${reading.senators.map((senator) => senator.party).join(" and ")}`}</Text>
            <View minWidth={180} flex={1}>
              <Meter label="Mood toward you" value={reading.standing.value} figure={`${reading.standing.word} ${reading.standing.percent}`} tone={STANCE_METER[reading.standing.stance]} />
            </View>
          </Row>
        </RowLink>
      )} />
      </ReadingFrame>
    </Card>
  );
}

/**
 * What Congress is owed or owed by the President: war powers and the
 * appropriation. A running War Powers clock is decided where the force is,
 * so each one opens its paper rather than being certified from here.
 */
export function Powers({ campaign }: { readonly campaign: Campaign }) {
  const war = warPowersReading(campaign);
  const money = appropriationReading(campaign);
  const notices = extensionNotices(campaign);
  return (
    <Column gap="xl">
      <Card title="War powers" icon="conflict" edge={war.unauthorized.length > 0 ? "danger" : "success"} actions={<Authority cite={LAW.warPowers} compact />} help={<CitedLawHelp title="The War Powers Resolution" meaning="When you send troops into fighting, you have to tell Congress within 48 hours. You have to bring them home within 60 days unless Congress declares war or votes to approve the use of force. You can get up to 90 days if you certify that you need the extra time to pull them out safely." cites={[LAW.warPowers]} />}>
        <Text variant="label" tone={war.unauthorized.length > 0 ? "danger" : "success"}>{war.headline}</Text>
        <Text variant="caption">{war.detail}</Text>
        {notices.length === 0 ? <Empty title="No deployment is on a War Powers clock" detail="No troops sent into combat are on a 60-day clock." /> : null}
        {notices.map((notice) => (
          <CardLink key={notice.id} label={`Open the War Powers paper on ${notice.target}`} href={notice.home} onPress={() => go(notice.home)} pad="md" accentEdge={notice.daysLeft <= 14 ? "danger" : "warning"}>
            <Column gap="xs">
              <Text variant="label">{`War Powers clock on ${notice.target}`}</Text>
              <Text variant="caption">{notice.line}</Text>
              <ReadingFrame title="Days left on the War Powers clock" unit="Days, of the 60 allowed" period="Counting down from today" legend={markKeyEntries([{ kind: "gate" }])} help={{ meaning: "The War Powers Resolution gives you 60 days to bring troops home unless Congress approves. The bar is what's left. The dashed tick marks two weeks before the clock runs out.", term: termDoor("sixty-day-clock", "the 60-day clock") }}>
                <Meter label="Days left of 60" value={Math.max(0, notice.daysLeft) / 60} figure={`${notice.daysLeft} days`} tone={notice.daysLeft <= 14 ? "danger" : "warningInk"} marks={[{ id: "late", label: "Two weeks left", at: 14 / 60, kind: "gate" }]} />
              </ReadingFrame>
            </Column>
          </CardLink>
        ))}
      </Card>
      <Card title="Appropriations" icon="budget" actions={<Authority cite={LAW.appropriations} compact />} help={<CitedLawHelp title="Congress controls spending" meaning="The government can spend only the money Congress approves by law. When that approval runs out, agencies can't spend money or promise to spend money they don't have." cites={[LAW.appropriations, LAW.antideficiency]} />}>
        <Text variant="label" tone={STANCE_METER[money.stance] === "danger" ? "danger" : "primary"}>{money.headline}</Text>
        <Text variant="caption">{money.detail}</Text>
        {money.windowWeeks > 0 ? (
          <ReadingFrame title="Weeks of funding left" unit={`Weeks, of the ${money.windowWeeks} Congress approved`} period="Counting down from today" legend={markKeyEntries([{ kind: "gate" }])} help={{ meaning: "Congress approves money for a set stretch of weeks. The bar is how much of that stretch is left, red under 4 weeks and amber under 8. The dashed tick marks 8 weeks, when it's time for you to step in.", term: termDoor("appropriation", "an appropriation") }}>
            <Meter label="Funding left" value={money.weeksLeft / money.windowWeeks} figure={`${money.weeksLeft} of ${money.windowWeeks} weeks`} tone={money.weeksLeft <= 4 ? "danger" : money.weeksLeft <= 8 ? "warningInk" : "successInk"} marks={[{ id: "watch", label: "8 weeks left, time for you to step in", at: 8 / money.windowWeeks, kind: "gate" }]} />
          </ReadingFrame>
        ) : null}
      </Card>
    </Column>
  );
}
