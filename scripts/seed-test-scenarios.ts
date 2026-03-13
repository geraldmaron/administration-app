/*
 * Seeds 3 hand-crafted test scenarios into Firestore.
 * Covers economy, military, and corruption bundles.
 * Usage: npx tsx scripts/seed-test-scenarios.ts
 */
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
if (!admin.apps.length) {
  const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'the-administration-3a072' });
}

const db = admin.firestore();

const scenarios = [
  {
    id: 'test_economy_001',
    title: 'Central Bank Under Political Fire',
    description:
      '{the_finance_role} has proposed legislation that would give your office direct control over {the_central_bank}\'s interest rate decisions. If passed, this would end decades of monetary independence and risk a sharp fall in international investor confidence.',
    metadata: {
      bundle: 'economy',
      severity: 'high',
      urgency: 'high',
      tags: ['economy', 'monetary-policy', 'institutions'],
      source: 'manual',
      mode_availability: ['standard', 'sandbox'],
      applicable_countries: 'all',
    },
    options: [
      {
        id: 'opt_a',
        label: 'Push the legislation',
        text: 'You back {the_finance_role}\'s proposal and send the bill to {the_legislature} for an accelerated vote. Centralizing rate decisions under your office gives you direct tools to stimulate the economy ahead of elections.',
        effects: [
          { targetMetricId: 'metric_economy', value: -2.1, duration: 14, probability: 1 },
          { targetMetricId: 'metric_approval', value: 1.8, duration: 8, probability: 1 },
          { targetMetricId: 'metric_foreign_relations', value: -1.6, duration: 12, probability: 1 },
        ],
        outcomeHeadline: 'Central Bank Independence Stripped by Law',
        outcomeSummary:
          'The administration enacted legislation transferring interest rate authority from {the_central_bank} to the executive office, ending an era of independent monetary policy. International credit agencies downgraded {the_player_country}\'s debt outlook within 48 hours, citing governance concerns. Trading partners expressed alarm at the consolidation of fiscal and monetary power under a single political figure.',
        outcomeContext:
          'The new law prompted the resignation of three senior {the_central_bank} governors, who issued a joint statement warning of inflation risks from politically motivated rate cuts. Foreign institutional investors began withdrawing bond holdings, triggering a rise in borrowing costs that {the_finance_role} acknowledged could offset any short-term stimulus benefit. Legal scholars debated whether the legislation violated constitutional provisions separating executive and monetary authority. {the_legislature}\'s opposition bloc announced a formal challenge before {the_judicial_role}, extending the policy uncertainty into the next fiscal quarter.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'support',
            feedback:
              'Direct control over {the_central_bank}\'s rate decisions gives your office the fastest lever to cut borrowing costs before the next election, though a sovereign credit downgrade would raise interest payments for households and small businesses across {the_player_country}.',
          },
          {
            roleId: 'role_economy',
            stance: 'concerned',
            feedback:
              'The transfer of rate-setting authority to the executive breaks the institutional credibility that keeps bond yields stable — once foreign debt holders perceive political interference in monetary policy, reversing the premium they charge takes years, not months.',
          },
          {
            roleId: 'role_diplomacy',
            stance: 'oppose',
            feedback:
              'Major trading partners have already signaled that politically directed rate cuts will trigger early reviews of bilateral credit arrangements — losing those terms eliminates a significant buffer for {the_player_country}\'s export sector.',
          },
        ],
      },
      {
        id: 'opt_b',
        label: 'Withdraw the bill',
        text: 'You instruct {the_finance_role} to pull the legislation before it reaches a floor vote and issue a statement reaffirming {the_central_bank}\'s independence. This preserves market confidence but leaves your direct influence over monetary policy unchanged.',
        effects: [
          { targetMetricId: 'metric_economy', value: 1.3, duration: 10, probability: 1 },
          { targetMetricId: 'metric_foreign_relations', value: 1.1, duration: 8, probability: 1 },
          { targetMetricId: 'metric_approval', value: -0.9, duration: 6, probability: 1 },
        ],
        outcomeHeadline: 'Administration Drops Rate Control Bid',
        outcomeSummary:
          'The administration withdrew the proposed legislation seventeen days after {the_finance_role} submitted it, citing a need for further consultation with monetary authorities. {the_central_bank} welcomed the reversal and held its scheduled rate review without political interference. Bond markets stabilized within a trading session, reversing a brief yield spike triggered by speculation about the bill.',
        outcomeContext:
          'The withdrawal came after back-channel pressure from two major institutional lenders, whose representatives had privately warned that the legislation threatened existing credit lines. {the_finance_role} publicly reframed the episode as a policy review rather than a retreat, announcing a formal working group on monetary coordination. Opposition leaders credited market pressure rather than principled governance with the reversal, keeping political pressure on the administration. {the_central_bank}\'s independence rating, tracked by three international financial bodies, recovered to pre-bill levels within the month.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'neutral',
            feedback:
              'Pulling the bill avoids an immediate credit rating hit, but without any structural change to monetary coordination, the same inflationary pressures that prompted the proposal will resurface ahead of the budget cycle.',
          },
          {
            roleId: 'role_economy',
            stance: 'support',
            feedback:
              'Preserving {the_central_bank}\'s independence keeps the sovereign risk premium low — the additional basis points added by the bill\'s introduction alone already cost the treasury more in refinancing costs than any projected short-term stimulus gain.',
          },
          {
            roleId: 'role_diplomacy',
            stance: 'support',
            feedback:
              'Trading partners have signaled they will treat the withdrawal as a restoration of norms; the bilateral investment review that {the_adversary} had quietly initiated can now be deprioritized, reducing pressure on {the_player_country}\'s trade balance.',
          },
        ],
      },
      {
        id: 'opt_c',
        label: 'Create an oversight panel',
        text: 'You propose a {legislature}-overseen advisory panel that grants {the_finance_role} formal input into {the_central_bank}\'s rate deliberations without transferring decision-making authority. This threads the needle between political influence and institutional credibility.',
        effects: [
          { targetMetricId: 'metric_economy', value: -0.7, duration: 8, probability: 1 },
          { targetMetricId: 'metric_democracy', value: 0.9, duration: 12, probability: 1 },
          { targetMetricId: 'metric_approval', value: 0.6, duration: 6, probability: 1 },
        ],
        outcomeHeadline: 'Independent Panel Set to Advise Central Bank',
        outcomeSummary:
          'The administration established a {legislature}-supervised advisory panel with a mandate to present economic outlook reports to {the_central_bank} ahead of each rate decision. The measure fell short of the direct control originally proposed, drawing criticism from fiscal hardliners within {the_ruling_party}. Credit analysts described the compromise as a workable middle path that preserved formal independence while opening structured dialogue.',
        outcomeContext:
          'The advisory panel\'s composition became an immediate source of dispute, with opposition members demanding equal representation alongside ruling-party nominees. {the_central_bank}\'s governor accepted the arrangement conditionally, warning that any attempt to use panel reports as binding guidance would trigger a constitutional review. Economists noted that similar advisory mechanisms in comparable economies had reduced rate decision reaction times without meaningfully impairing independence. {the_finance_role} acknowledged that the panel\'s first formal report would not be ready before the next scheduled rate review, leaving a gap in the administration\'s stimulus timeline.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'support',
            feedback:
              'The advisory panel gives your administration a formal seat at the deliberation table without triggering the credit downgrade that direct control would have caused — incremental influence is more durable than overreach.',
          },
          {
            roleId: 'role_economy',
            stance: 'neutral',
            feedback:
              'An advisory mechanism rarely shifts central bank decisions without binding authority; the real test is whether {the_legislature}\'s committee structure allows {the_finance_role} to shape the economic outlook assumptions that frame each rate decision.',
          },
          {
            roleId: 'role_diplomacy',
            stance: 'support',
            feedback:
              'Structuring the reform through {the_legislature} signals institutional good faith to trading partners who were monitoring the legislation — the advisory model is broadly consistent with frameworks used by comparable economies in {the_regional_bloc}.',
          },
        ],
      },
    ],
    type: 'generated',
    source: 'manual',
    is_active: true,
    auditScore: 100,
  },
  {
    id: 'test_military_001',
    title: 'Armed Incursion at the Frontier',
    description:
      'A unit from {the_border_rival}\'s military crossed into your territory overnight and destroyed a monitoring outpost before withdrawing. {the_defense_role} has requested authorization to respond, and {the_regional_bloc} has called for an emergency session.',
    metadata: {
      bundle: 'military',
      severity: 'high',
      urgency: 'immediate',
      tags: ['military', 'border', 'diplomacy'],
      source: 'manual',
      mode_availability: ['standard', 'sandbox'],
      applicable_countries: 'all',
    },
    options: [
      {
        id: 'opt_a',
        label: 'Strike a military target',
        text: 'You authorize {the_military_general} to strike a {the_border_rival} forward operating base identified as the staging point for the incursion. The action is framed as a proportionate response under established rules of engagement, not an escalation.',
        effects: [
          { targetMetricId: 'metric_military', value: 1.9, duration: 12, probability: 1 },
          { targetMetricId: 'metric_foreign_relations', value: -2.3, duration: 16, probability: 1 },
          { targetMetricId: 'metric_approval', value: 1.4, duration: 8, probability: 1 },
        ],
        outcomeHeadline: 'Military Strikes Border Rival Forward Base',
        outcomeSummary:
          'Armed forces carried out a precision strike on a {the_border_rival} logistics base in a contested zone, destroying supply infrastructure and triggering a formal protest from {the_border_rival}\'s foreign ministry. {the_regional_bloc} issued a statement calling for immediate ceasefire talks, warning that both governments risked a cycle of retaliatory exchanges. Defense analysts characterized the operation as calibrated but said it crossed a threshold that would require {the_border_rival} to respond or accept a loss of deterrence credibility.',
        outcomeContext:
          'The strike destroyed a forward supply depot and disabled two communications towers, according to operational reports released by {the_defense_role}. {the_border_rival}\'s government convened an emergency session and placed its frontier units on heightened alert, while state media broadcast imagery of the original outpost destruction that had preceded the strike. {the_regional_bloc}\'s emergency session produced a joint call for restraint signed by eleven member states, though {the_adversary} withheld its endorsement. Troop movements in the days following the operation kept frontier communities on edge and strained civilian supply routes through the contested zone.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'support',
            feedback:
              'Authorizing a proportionate strike reestablishes deterrence credibility after the outpost destruction — without a visible response, {the_border_rival} would treat inaction as permission to probe further.',
          },
          {
            roleId: 'role_military',
            stance: 'support',
            feedback:
              'The targeted logistics depot is the correct objective: degrading its supply capacity forces {the_border_rival}\'s frontier units to draw down operational tempo for at least two weeks without requiring a ground incursion.',
          },
          {
            roleId: 'role_defense',
            stance: 'concerned',
            feedback:
              'A strike response shifts the engagement from a territorial probe to a mutual firepower exchange — rules of engagement for follow-on operations need cabinet authorization before {the_military_general} has any flexibility to respond to {the_border_rival}\'s inevitable counter-move.',
          },
          {
            roleId: 'role_diplomacy',
            stance: 'oppose',
            feedback:
              'Striking across the frontier forecloses the de-escalation path that {the_regional_bloc} was preparing; {the_adversary}\'s decision to withhold consent from the ceasefire statement suggests it may exploit the conflict to pressure {the_player_country} on a separate trade file.',
          },
        ],
      },
      {
        id: 'opt_b',
        label: 'Request emergency talks',
        text: 'You direct {the_foreign_affairs_role} to demand an emergency security meeting with {the_border_rival}\'s government through {the_regional_bloc}\'s conflict resolution mechanism. You condition resumed border patrols on a public acknowledgment of the incursion from {the_border_rival}\'s leadership.',
        effects: [
          { targetMetricId: 'metric_foreign_relations', value: 1.6, duration: 14, probability: 1 },
          { targetMetricId: 'metric_military', value: -1.2, duration: 8, probability: 1 },
          { targetMetricId: 'metric_approval', value: -0.8, duration: 6, probability: 1 },
        ],
        outcomeHeadline: 'Emergency Talks Convened After Border Incident',
        outcomeSummary:
          'The administration initiated emergency diplomatic proceedings through {the_regional_bloc} following the cross-border incursion, pausing military counter-authorization while talks were arranged. {the_border_rival}\'s foreign ministry agreed to attend preliminary consultations, though no public acknowledgment of the incursion was offered. Defense analysts noted that suspending a visible response left the frontier force posture unchanged for at least two weeks.',
        outcomeContext:
          'The talks opened in {the_regional_bloc}\'s mediation chambers with delegations from both governments presenting conflicting accounts of the incident. {the_border_rival} characterized the destroyed outpost as an illegal monitoring installation, a claim disputed by {the_player_country}\'s {defense_role} using satellite imagery. Preliminary sessions produced an agreement to establish a joint border monitoring commission, though opposition figures at home criticized the arrangement as a concession to aggression. Frontier units on both sides maintained elevated alert postures throughout the negotiations, increasing the risk of an accidental engagement.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'neutral',
            feedback:
              'Requesting talks preserves international standing and keeps escalation options open, but conditional demands that {the_border_rival} publicly acknowledge the incursion give their leadership an easy excuse to delay or refuse.',
          },
          {
            roleId: 'role_military',
            stance: 'concerned',
            feedback:
              'Suspending an operational counter-response for two or more weeks reduces deterrence pressure while {the_border_rival} repositions its frontier units — tactical advantage degrades as a function of time.',
          },
          {
            roleId: 'role_diplomacy',
            stance: 'support',
            feedback:
              'The {the_regional_bloc} mediation channel is the only framework with binding ceasefire authority; using it immediately creates a documented record of {the_player_country}\'s compliance with established conflict resolution norms, which matters if the situation escalates further.',
          },
        ],
      },
      {
        id: 'opt_c',
        label: 'Reinforce the frontier',
        text: 'You order {the_military_general} to double the troop presence in the contested zone and increase aerial surveillance without authorizing offensive action. The reinforcement signals resolve to {the_border_rival} while keeping the diplomatic channel open.',
        effects: [
          { targetMetricId: 'metric_military', value: 1.5, duration: 10, probability: 1 },
          { targetMetricId: 'metric_sovereignty', value: 1.2, duration: 14, probability: 1 },
          { targetMetricId: 'metric_approval', value: 0.9, duration: 6, probability: 1 },
        ],
        outcomeHeadline: 'Frontier Reinforced After Cross-Border Strike',
        outcomeSummary:
          'The administration deployed additional ground forces and expanded aerial surveillance in the contested frontier zone following {the_border_rival}\'s overnight incursion. The reinforcement was described by {the_defense_role} as a defensive posture adjustment, not a prelude to offensive operations. {the_border_rival}\'s command structures registered the troop buildup and increased their own alert levels in response.',
        outcomeContext:
          'Troop movements were visible to civilian populations in frontier settlements, prompting precautionary evacuations of two communities near the affected zone. {the_regional_bloc} acknowledged the deployment as a lawful sovereign response under its charter provisions, though it appealed for parallel diplomatic engagement. {the_border_rival}\'s state broadcaster described the reinforcement as a provocation, while its foreign ministry simultaneously signaled willingness to discuss a border incident commission. {the_military_general} briefed {the_legislature}\'s defense committee on operational readiness, emphasizing that current rules of engagement did not authorize first-strike action.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'support',
            feedback:
              'Reinforcing without striking gives your administration a demonstrable response that domestic audiences can see, while keeping diplomatic off-ramps intact and avoiding the international censure a strike would attract.',
          },
          {
            roleId: 'role_military',
            stance: 'support',
            feedback:
              'Doubling the frontier presence forces {the_border_rival} to allocate intelligence and logistics resources to monitoring your buildup rather than planning a second probe — operational tempo shifts to your timetable without firing a shot.',
          },
          {
            roleId: 'role_interior',
            stance: 'concerned',
            feedback:
              'Concentrating additional military assets near populated frontier settlements requires coordinated security protocols to prevent civilian displacement from straining local infrastructure and triggering internal displacement processing backlogs in {the_player_country}\'s border administration.',
          },
        ],
      },
    ],
    type: 'generated',
    source: 'manual',
    is_active: true,
    auditScore: 100,
  },
  {
    id: 'test_corruption_001',
    title: 'Infrastructure Contracts Tainted by Corruption',
    description:
      'Your {intelligence_agency} has uncovered evidence that officials in {the_commerce_role}\'s division inflated procurement contracts for a major road project, diverting {graft_amount} to connected private firms. The case involves three mid-level officials, though investigators believe senior oversight failures enabled the scheme.',
    metadata: {
      bundle: 'corruption',
      severity: 'high',
      urgency: 'high',
      tags: ['corruption', 'justice', 'procurement'],
      source: 'manual',
      mode_availability: ['standard', 'sandbox'],
      applicable_countries: 'all',
    },
    options: [
      {
        id: 'opt_a',
        label: 'Prosecute publicly',
        text: 'You instruct {the_prosecutor_role} to open formal charges against all implicated officials and release the investigative summary to the public through your {press_secretary}. The transparency signals zero tolerance but exposes {the_ruling_party} to sustained media scrutiny as trials proceed.',
        effects: [
          { targetMetricId: 'metric_corruption', value: -2.4, duration: 16, probability: 1 },
          { targetMetricId: 'metric_democracy', value: 1.7, duration: 14, probability: 1 },
          { targetMetricId: 'metric_approval', value: 1.3, duration: 10, probability: 1 },
        ],
        outcomeHeadline: 'Corruption Charges Filed in Roads Scandal',
        outcomeSummary:
          'The administration filed formal corruption charges against three procurement officials following an {intelligence_agency} investigation into inflated road construction contracts. {the_prosecutor_role} released a detailed indictment outlining the mechanism by which project budgets were padded and funds redirected to shell companies. Two multilateral lenders cited the prosecution as evidence of strengthened institutional accountability within {the_player_country}.',
        outcomeContext:
          'Proceedings began in {the_judicial_role}, with defense lawyers arguing that the indictment was politically motivated and that the officials acted within delegated authority. {the_press_secretary} faced sustained questioning at briefings about whether senior figures in {the_commerce_role}\'s chain of command had signed off on the procurement approvals. Anti-corruption monitors upgraded {the_player_country}\'s transparency index score by two points, noting the speed of the public disclosure. The trials introduced a months-long delay into the road project itself, with contractors refusing to proceed under the cloud of an active judicial inquiry.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'support',
            feedback:
              'Going public with the charges before any political management creates a credibility dividend that is far harder to manufacture later — transparency on corruption is one of the clearest approval drivers available to a sitting government.',
          },
          {
            roleId: 'role_justice',
            stance: 'support',
            feedback:
              'Releasing the investigative summary alongside the charges sets a discoverable evidentiary record that insulates {the_prosecutor_role}\'s case from claims of selective prosecution — the public documentation precludes backroom deal-making that typically delays convictions.',
          },
          {
            roleId: 'role_economy',
            stance: 'concerned',
            feedback:
              'The indictment freeze on the road project will delay infrastructure completion by at least one construction season, stalling productivity gains in the affected supply corridor and creating a gap between the announced investment and visible outcomes.',
          },
        ],
      },
      {
        id: 'opt_b',
        label: 'Discipline internally',
        text: 'You direct {the_cabinet_secretary} to conduct an internal disciplinary review and dismiss the implicated officials through administrative channels rather than criminal proceedings. You frame this as swift accountability while avoiding a prolonged public trial that could destabilize the broader infrastructure program.',
        effects: [
          { targetMetricId: 'metric_corruption', value: -0.9, duration: 10, probability: 1 },
          { targetMetricId: 'metric_bureaucracy', value: 1.1, duration: 12, probability: 1 },
          { targetMetricId: 'metric_approval', value: -1.4, duration: 10, probability: 1 },
        ],
        outcomeHeadline: 'Procurement Officials Dismissed Over Contract Fraud',
        outcomeSummary:
          'Three procurement officials were dismissed from their posts following an internal review ordered by the administration into inflated road construction contracts. No criminal referral was made, a decision that anti-corruption groups immediately criticized as insufficient given the scale of the {graft_amount} involved. {the_cabinet_secretary} described the dismissals as swift and proportionate, but the absence of judicial process drew calls for independent scrutiny.',
        outcomeContext:
          'Opposition leaders demanded a {the_legislature} inquiry after details of the internal review leaked, arguing that administrative discipline without prosecution left the diversion mechanism intact for future contractors. Anti-corruption monitoring bodies noted that the case lacked the judicial record needed to deter similar schemes in ongoing procurement rounds. {the_prosecutor_role} issued an unsolicited statement indicating that the evidence appeared to meet the threshold for criminal charges, adding pressure on the administration\'s framing. The road project resumed on schedule, though two shortlisted contractors withdrew their bids citing reputational risk from the association with the tainted contract round.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'neutral',
            feedback:
              'Administrative dismissal closes the immediate personnel issue without a trial, but the absence of criminal accountability leaves a visible gap that opposition media will exploit for months — this resolves the incident without resolving the story.',
          },
          {
            roleId: 'role_justice',
            stance: 'oppose',
            feedback:
              'Foregoing prosecution when {the_prosecutor_role}\'s own assessment indicates sufficient evidence sends a signal to contract administrators across every ministry that diversion at this scale carries only career, not criminal, consequences.',
          },
          {
            roleId: 'role_commerce',
            stance: 'neutral',
            feedback:
              'The dismissed officials\' departure allows the road project to proceed under new procurement management, but the contracting framework that enabled the inflation remains unchanged, creating exposure in the next infrastructure round.',
          },
        ],
      },
      {
        id: 'opt_c',
        label: 'Appoint an inquiry commission',
        text: 'You establish an independent commission chaired by a retired judge with a mandate to audit all procurement contracts from the past three fiscal years and recommend charges where evidence warrants. The broader review demonstrates systemic intent but delays resolution of the immediate case.',
        effects: [
          { targetMetricId: 'metric_corruption', value: -1.6, duration: 18, probability: 1 },
          { targetMetricId: 'metric_democracy', value: 1.3, duration: 16, probability: 1 },
          { targetMetricId: 'metric_bureaucracy', value: -0.8, duration: 10, probability: 1 },
        ],
        outcomeHeadline: 'Independent Commission to Probe Contract Fraud',
        outcomeSummary:
          'The administration appointed a retired judge to lead an independent procurement inquiry spanning three fiscal years of infrastructure contracting. The commission\'s scope extended beyond the original three officials to include a full review of approval chains within {the_commerce_role}\'s division. Legal observers praised the move as structurally thorough while cautioning that extended timelines could reduce political accountability before the next electoral cycle.',
        outcomeContext:
          'The commission subpoenaed contract records from fourteen government departments, prompting procedural challenges from two ministries over document classification exemptions. {the_prosecutor_role} confirmed cooperation with the inquiry, noting that criminal referrals would depend on what evidence the commission\'s auditors surfaced in sealed tender files. Budget allocation for the commission\'s operations required {the_legislature}\'s formal approval, adding a three-week delay before investigators could begin on-site work. Infrastructure contractors paused procurement bids pending the commission\'s interim report, pushing the road project timeline back by at least one quarter.',
        advisorFeedback: [
          {
            roleId: 'role_executive',
            stance: 'support',
            feedback:
              'An independent commission chaired by a former judge insulates your office from the appearance of controlling the outcome — the political risk of a slow process is lower than the risk of a covered-up process surfacing later.',
          },
          {
            roleId: 'role_justice',
            stance: 'support',
            feedback:
              'A judge-led inquiry with subpoena authority over sealed tender files is the correct instrument for this scale of diversion — it creates a legally admissible evidentiary foundation that a purely administrative review cannot produce.',
          },
          {
            roleId: 'role_commerce',
            stance: 'concerned',
            feedback:
              'Expanding the scope to three fiscal years of contracting will freeze new procurement approvals for months as administrators await guidance on which processes are under review, directly delaying infrastructure development beyond the road project.',
          },
        ],
      },
    ],
    type: 'generated',
    source: 'manual',
    is_active: true,
    auditScore: 100,
  },
];

async function main() {
  let saved = 0;
  let skipped = 0;

  for (const scenario of scenarios) {
    const docRef = db.collection('scenarios').doc(scenario.id);
    const existing = await docRef.get();
    if (existing.exists) {
      console.log(`Skipped (already exists): ${scenario.id}`);
      skipped++;
      continue;
    }
    await docRef.set({
      ...scenario,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Saved: ${scenario.id} (${scenario.metadata.bundle})`);
    saved++;
  }

  console.log(`\nDone. Saved: ${saved}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
