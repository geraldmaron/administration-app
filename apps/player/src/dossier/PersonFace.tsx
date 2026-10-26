import { usPartyOfPerson, type Campaign } from "@admin/engine";
import { portraitSpecFor } from "@admin/player-core";
import type { Person } from "@admin/world";
import { Portrait } from "@admin/ui/portrait";
import { PARTY_INK } from "../founding/glyphs";

type Common = { readonly size: number; readonly muted?: boolean; readonly square?: boolean; readonly decorative?: boolean };

/** Seen in a campaign, a person is named by id and drawn at their age today; before one (the founding), by their record. */
export type PersonFaceProps = Common & ({ readonly campaign: Campaign; readonly id: string | undefined; readonly name: string } | { readonly person: Person });

/**
 * A person's face from their own record, ringed in their party's color as a fact about them;
 * their initials when the record has no face yet or the id names nobody.
 */
export function PersonFace(props: PersonFaceProps) {
  const { size, muted, square, decorative = true } = props;
  const campaign = "campaign" in props ? props.campaign : undefined;
  const person = "person" in props ? props.person : props.id ? props.campaign.people[props.id as keyof typeof props.campaign.people]?.base : undefined;
  const name = "person" in props ? props.person.name : props.name;
  const face = person ? portraitSpecFor(person, campaign ? { campaign } : {}) : undefined;
  const party = person ? usPartyOfPerson(person) : undefined;
  return <Portrait face={face} name={name} size={size} shape={square ? "square" : "circle"} decorative={decorative} {...(party ? { ring: PARTY_INK[party] } : {})} {...(muted ? { muted } : {})} />;
}
