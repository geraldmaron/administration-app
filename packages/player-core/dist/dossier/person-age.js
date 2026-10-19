import { campaignFoundingDate, daysBetween } from "@admin/engine";
const DAYS_PER_YEAR = 365.2425;
/**
 * A person's age today. The record holds the age they had when the campaign
 * was founded, and every surface that shows a person, their portrait and the
 * line under their name alike, reads this one number so a face and its caption
 * can never disagree about how old someone is.
 */
export function currentAge(person, campaign) {
    const elapsed = daysBetween(campaignFoundingDate(campaign), campaign.calendar);
    return person.age + Math.max(0, Math.floor(elapsed / DAYS_PER_YEAR));
}
