import { coalitionFor } from "@admin/engine";
export function coalitionReading(campaign, target, limit = 8) {
    const { backers, torn } = coalitionFor(campaign, campaign.founding.nation, target);
    return { backers: backers.slice(0, limit), torn };
}
