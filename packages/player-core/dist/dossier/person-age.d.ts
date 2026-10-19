import { type Campaign } from "@admin/engine";
import type { Person } from "@admin/world";
/**
 * A person's age today. The record holds the age they had when the campaign
 * was founded, and every surface that shows a person, their portrait and the
 * line under their name alike, reads this one number so a face and its caption
 * can never disagree about how old someone is.
 */
export declare function currentAge(person: Pick<Person, "age">, campaign: Campaign): number;
