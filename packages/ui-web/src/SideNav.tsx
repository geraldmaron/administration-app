import { useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { Sheet } from "./Layer";
import { Icon, type IconName } from "./Icon";

export type NavItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: IconName;
  /** How many things here are new to the President: drawn as a red badge and said in the name. */
  readonly attention?: number;
  /** How many things here still need the President, new or already seen: drawn quietly once none of them is new. */
  readonly waiting?: number;
};

export type NavGroup = {
  readonly id: string;
  /** The group's heading in the full list, and its name in the compact rail and the phone bar. */
  readonly label: string;
  readonly icon: IconName;
  readonly items: readonly NavItem[];
};

export type NavLinkProps = {
  readonly href: string;
  readonly className: string;
  readonly "aria-current"?: "page";
  readonly "aria-label"?: string;
  readonly onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  readonly children: ReactNode;
};

export type SideNavProps = {
  readonly groups: readonly NavGroup[];
  /** Destinations kept apart from the work at the foot of the list: saves, settings. */
  readonly utilities?: readonly NavItem[];
  /** The id of the item the player is on; its group is the current group. */
  readonly current: string | undefined;
  /** The groups the phone bar names directly; the rest are behind More. */
  readonly phoneGroups?: readonly string[];
  /** Settings that belong with navigation when the bar has no room for them, drawn at the foot of the drawer. */
  readonly drawerFoot?: ReactNode;
  /** The app's router link. A plain anchor works too, at the cost of a full page load. */
  readonly Link?: ComponentType<NavLinkProps>;
};

function Anchor({ children, ...rest }: NavLinkProps) {
  return <a {...rest}>{children}</a>;
}

type Counts = { readonly fresh: number; readonly waiting: number };

const countsOf = (item: NavItem): Counts => ({ fresh: item.attention ?? 0, waiting: Math.max(item.waiting ?? 0, item.attention ?? 0) });

const sum = (items: readonly NavItem[]): Counts =>
  items.map(countsOf).reduce((total, next) => ({ fresh: total.fresh + next.fresh, waiting: total.waiting + next.waiting }), { fresh: 0, waiting: 0 });

/** "Congress, 1 new, 3 waiting on you": what the badge draws, said to a screen reader. */
function named(label: string, { fresh, waiting }: Counts): string | undefined {
  if (waiting <= 0) return undefined;
  return fresh > 0 ? `${label}, ${fresh} new, ${waiting} waiting on you` : `${label}, ${waiting} waiting on you`;
}

/** Red while anything here is new; once all of it has been seen, a quiet count of what still waits. */
function Badge({ counts }: { readonly counts: Counts }) {
  const shown = counts.fresh > 0 ? counts.fresh : counts.waiting;
  if (shown <= 0) return null;
  return (
    <span className={counts.fresh > 0 ? "ui-nav__badge" : "ui-nav__badge ui-nav__badge--quiet"} aria-hidden="true">
      {shown > 9 ? "9+" : shown}
    </span>
  );
}

type ListProps = Pick<SideNavProps, "groups" | "utilities" | "current"> & { readonly Link: ComponentType<NavLinkProps>; readonly onNavigate?: () => void };

/** Every destination under its group's heading: the wide navigation and the drawer. */
function FullList({ groups, utilities = [], current, Link, onNavigate }: ListProps) {
  const link = (item: NavItem) => {
    const label = named(item.label, countsOf(item));
    return (
      <li key={item.id}>
        <Link href={item.href} className="ui-nav__link" {...(item.id === current ? { "aria-current": "page" as const } : {})} {...(label ? { "aria-label": label } : {})} {...(onNavigate ? { onClick: onNavigate } : {})}>
          <Icon name={item.icon} size={20} />
          <span className="ui-nav__label">{item.label}</span>
          <Badge counts={countsOf(item)} />
        </Link>
      </li>
    );
  };
  return (
    <div className="ui-nav__full">
      {groups.map((group) => (
        <section key={group.id} className="ui-nav__group" aria-labelledby={`nav-group-${group.id}`}>
          <h2 className="ui-nav__heading" id={`nav-group-${group.id}`}>
            {group.label}
          </h2>
          <ul className="ui-nav__list">{group.items.map(link)}</ul>
        </section>
      ))}
      {utilities.length > 0 ? <ul className="ui-nav__list ui-nav__list--utilities">{utilities.map(link)}</ul> : null}
    </div>
  );
}

/** One entry per group, the label under its mark: the compact rail and the phone bar. */
function GroupEntry({ group, current, Link }: { readonly group: NavGroup; readonly current: string | undefined; readonly Link: ComponentType<NavLinkProps> }) {
  const active = group.items.some((item) => item.id === current);
  const count = sum(group.items);
  const label = named(group.label, count);
  return (
    <li>
      <Link href={group.items[0]!.href} className="ui-nav__group-link" {...(active ? { "aria-current": "page" as const } : {})} {...(label ? { "aria-label": label } : {})}>
        <span className="ui-nav__glyph">
          <Icon name={group.icon} size={24} />
          <Badge counts={count} />
        </span>
        <span className="ui-nav__group-label">{group.label}</span>
      </Link>
    </li>
  );
}

/**
 * The main navigation. Wide screens list every destination under its group;
 * a laptop width shows one labeled entry per group; a tablet opens the full
 * list as a drawer; a phone keeps a bar of the main groups and More.
 */
export function SideNav({ groups, utilities = [], current, phoneGroups, drawerFoot, Link = Anchor }: SideNavProps) {
  const [open, setOpen] = useState(false);
  const show = () => setOpen(true);
  const close = () => setOpen(false);
  const onPhone = phoneGroups ? groups.filter((group) => phoneGroups.includes(group.id)) : groups.slice(0, 4);
  const behindMore = groups.filter((group) => !onPhone.includes(group));
  const moreActive = behindMore.some((group) => group.items.some((item) => item.id === current)) || utilities.some((item) => item.id === current);
  const moreCount = sum(behindMore.flatMap((group) => group.items));
  return (
    <nav className="ui-nav" aria-label="Main">
      <button type="button" className="ui-nav__menu" aria-haspopup="dialog" aria-expanded={open} onClick={show}>
        <Icon name="menu" size={24} />
        <span className="ui-nav__menu-label">Menu</span>
      </button>
      <FullList groups={groups} utilities={utilities} current={current} Link={Link} />
      <ul className="ui-nav__rail">
        {groups.map((group) => (
          <GroupEntry key={group.id} group={group} current={current} Link={Link} />
        ))}
      </ul>
      <ul className="ui-nav__bar">
        {onPhone.map((group) => (
          <GroupEntry key={group.id} group={group} current={current} Link={Link} />
        ))}
        <li>
          <button type="button" className="ui-nav__group-link" aria-haspopup="dialog" aria-expanded={open} {...(moreActive ? { "data-current": "true" } : {})} aria-label={named("More", moreCount) ?? "More"} onClick={show}>
            <span className="ui-nav__glyph">
              <Icon name="menu" size={24} />
              <Badge counts={moreCount} />
            </span>
            <span className="ui-nav__group-label">More</span>
          </button>
        </li>
      </ul>
      <Sheet open={open} onClose={close} placement="side" className="ui-nav__drawer" title="All destinations" closeLabel="Close the menu" foot={drawerFoot ? <div className="ui-nav__drawer-foot">{drawerFoot}</div> : undefined}>
        <FullList groups={groups} utilities={utilities} current={current} Link={Link} onNavigate={close} />
      </Sheet>
    </nav>
  );
}
