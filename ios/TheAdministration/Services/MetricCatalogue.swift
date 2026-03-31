import Foundation

struct MetricInfo {
    let description: String
    let factors: [String]
    let isInverse: Bool
    let category: String
}

enum MetricCatalogue {
    static let info: [String: MetricInfo] = [
        "metric_approval": MetricInfo(
            description: "Public approval of the administration. A (75+) is historically strong — few leaders sustain this outside rally events. C (~45-55) reflects a typical modern administration average. D (~30-40) signals severe crisis of confidence. F (<25) is below Nixon's resignation-level 24%.",
            factors: ["Major policy decisions", "Economic conditions", "Crisis outcomes", "Cabinet competency", "Media narrative"],
            isInverse: false,
            category: "Political"
        ),
        "metric_economy": MetricInfo(
            description: "Overall economic health — growth, stability, and output relative to baseline. A represents sustained boom comparable to 1990s expansion or post-WWII growth. C is moderate 2-3% GDP growth, the long-run OECD average. D is stagnation or mild recession. F is severe contraction comparable to the 2008 financial crisis.",
            factors: ["Fiscal policy and tax rates", "Trade agreements", "Employment levels", "Inflation", "Infrastructure investment"],
            isInverse: false,
            category: "Economic"
        ),
        "metric_foreign_relations": MetricInfo(
            description: "Diplomatic standing and international credibility. A reflects strong multilateral leadership and trusted alliance commitments. C indicates strained but functional relationships with some active disputes. D signals growing isolation and deteriorating alliances. F represents pariah-state status with active sanctions or severed ties.",
            factors: ["Diplomatic actions", "Military posture abroad", "Trade agreements", "Alliance commitments", "Humanitarian record"],
            isInverse: false,
            category: "Diplomatic"
        ),
        "metric_public_order": MetricInfo(
            description: "Domestic stability and the government's ability to maintain civil order. A reflects a peaceful society with high social cohesion. C indicates manageable tensions with periodic protests. D signals frequent disorder requiring security responses. F represents breakdown of civil order — widespread riots or martial law conditions.",
            factors: ["Unrest and protest levels", "Law enforcement policy", "Social spending", "Economic inequality", "Crisis handling"],
            isInverse: false,
            category: "Security"
        ),
        "metric_corruption": MetricInfo(
            description: "Perceived and actual corruption within government. Inverse metric — higher raw values mean more corruption. A (low corruption) reflects strong institutional transparency comparable to Nordic countries. C indicates moderate corruption typical of a mid-ranked democracy. F (high corruption) represents systemic kleptocracy eroding governance at every level.",
            factors: ["Transparency measures", "Cabinet integrity", "Oversight and accountability bodies", "Procurement practices"],
            isInverse: true,
            category: "Governance"
        ),
        "metric_liberty": MetricInfo(
            description: "Civil liberties and individual freedoms — expression, press, assembly, and protection from state overreach. A reflects robust protections comparable to top-ranked democracies. C indicates some restrictions but functional core freedoms. F represents authoritarian suppression of dissent, censorship, and political persecution.",
            factors: ["Surveillance and security policy", "Press freedom", "Protest and assembly rights", "Judicial independence"],
            isInverse: false,
            category: "Social"
        ),
        "metric_inflation": MetricInfo(
            description: "Rate of price increases. Inverse metric — higher raw values mean worse inflation. A (low raw) represents ~2% target inflation with price stability. C is 5-6% — concerning but manageable with policy tools. D is 7-9%, significantly eroding purchasing power. F (high raw) is double-digit inflation, a cost-of-living crisis comparable to 1970s stagflation.",
            factors: ["Monetary supply and deficit spending", "Supply chain conditions", "Energy prices", "Trade policy"],
            isInverse: true,
            category: "Economic"
        ),
        "metric_military": MetricInfo(
            description: "Military readiness, capability, and morale. A reflects dominant force projection with high readiness and modern capabilities. C is adequate peacetime defense posture with deployable forces. D indicates degraded readiness with equipment shortfalls. F represents a hollowed-out military unable to credibly deter or project force.",
            factors: ["Defense budget allocation", "Military engagement outcomes", "Arms modernization", "Alliance contributions"],
            isInverse: false,
            category: "Defense"
        ),
        "metric_innovation": MetricInfo(
            description: "Technological and scientific advancement — R&D capacity, education pipeline, and private sector dynamism. A reflects global R&D leadership comparable to peak US or Israeli innovation spending. C is moderate competitiveness with average R&D investment. F represents technological stagnation and brain drain.",
            factors: ["R&D and science funding", "Education policy", "Technology regulation", "Public-private partnerships"],
            isInverse: false,
            category: "Economic"
        ),
        "metric_health": MetricInfo(
            description: "Population health outcomes and healthcare system capacity. A reflects universal access with top-tier outcomes comparable to best OECD nations. C is adequate but inequitable — functional system with coverage gaps. D signals deteriorating outcomes and access barriers. F represents healthcare system collapse with widespread preventable mortality.",
            factors: ["Healthcare budget", "Public health programs", "Crisis response (epidemics, disasters)", "Environmental policy"],
            isInverse: false,
            category: "Social"
        ),
        "metric_equality": MetricInfo(
            description: "Economic and social equality — wealth distribution, opportunity access, and social mobility. A reflects low Gini coefficient with broad prosperity, comparable to Scandinavian models. C is moderate inequality typical of OECD nations. F represents extreme concentration of wealth with oligarchic capture of institutions.",
            factors: ["Tax progressivity", "Social welfare programs", "Education access", "Labor rights policy"],
            isInverse: false,
            category: "Social"
        ),
        "metric_employment": MetricInfo(
            description: "Labor market health — employment rates, job quality, and workforce participation. A reflects near-full employment (sub-4% unemployment) with strong wage growth. C is 5-6% unemployment with moderate labor slack. D is 7-9% elevated joblessness. F is 10%+ severe unemployment comparable to Great Recession peak.",
            factors: ["Economic growth", "Labor policy", "Industrial strategy", "Education and retraining programs"],
            isInverse: false,
            category: "Economic"
        ),
        "metric_environment": MetricInfo(
            description: "Environmental health and sustainability record — emissions, conservation, and ecological stewardship. A reflects strong environmental protections with declining emissions. C indicates adequate regulation but ongoing degradation. F represents environmental crisis with unchecked pollution, deforestation, or ecological collapse.",
            factors: ["Environmental regulations", "Energy policy", "Industrial emissions", "Conservation spending"],
            isInverse: false,
            category: "Environmental"
        ),
        "metric_budget": MetricInfo(
            description: "Fiscal health and budget sustainability. A reflects surplus or balanced budget with sustainable debt trajectory. C indicates deficits of 3-5% of GDP — common peacetime levels but requiring attention. D signals unsustainable deficits eroding fiscal space. F represents fiscal crisis with debt spiral risk and potential sovereign default.",
            factors: ["Tax policy", "Spending decisions", "Economic growth (affects revenue)", "Deficit or surplus carry-over"],
            isInverse: false,
            category: "Economic"
        ),
        "metric_trade": MetricInfo(
            description: "Trade balance and openness to international commerce. A reflects strong competitive position with diversified partnerships. C is balanced trade typical of a large economy. D indicates chronic deficits and deteriorating terms of trade. F represents trade isolation with collapsed partnerships or crippling sanctions.",
            factors: ["Trade agreements", "Tariff policy", "Currency strength", "Sanctions and retaliatory measures"],
            isInverse: false,
            category: "Economic"
        ),
        "metric_energy": MetricInfo(
            description: "Energy security and supply stability. A reflects energy independence with diverse, secure supply and active transition to renewables. C is adequate supply but vulnerable to disruption from import dependence. D signals significant energy insecurity with heavy reliance on volatile suppliers. F represents energy crisis with severe shortages affecting the economy.",
            factors: ["Energy infrastructure investment", "Import dependence", "Renewable transition policy", "Geopolitical energy relationships"],
            isInverse: false,
            category: "Infrastructure"
        ),
        "metric_infrastructure": MetricInfo(
            description: "Quality of critical public infrastructure — transport, utilities, and digital networks. A reflects world-class systems comparable to top OECD nations. C is functional but aging with visible deferred maintenance. D signals notable degradation affecting daily quality of life. F represents systemic failure with crumbling networks and regular service disruption.",
            factors: ["Infrastructure budget", "Maintenance programs", "Major capital projects", "Public-private investment"],
            isInverse: false,
            category: "Infrastructure"
        ),
        "metric_crime": MetricInfo(
            description: "Crime rate. Inverse metric — higher raw values mean more crime. A (low crime) reflects a safe society with low violent and property crime rates. C indicates moderate crime with functional law enforcement. F (high crime) represents rampant criminal activity and breakdown of law enforcement capacity.",
            factors: ["Law enforcement funding", "Social welfare programs", "Economic conditions", "Sentencing and rehabilitation policy"],
            isInverse: true,
            category: "Security"
        ),
        "metric_unrest": MetricInfo(
            description: "Social and political unrest — protests, strikes, and civil disobedience. Inverse metric — higher raw values mean more unrest. A (low unrest) reflects social peace with functional civic channels. C indicates periodic significant protests. F (high unrest) represents sustained civil unrest threatening governance stability.",
            factors: ["Approval rating", "Economic inequality", "Civil liberties restrictions", "Crisis severity"],
            isInverse: true,
            category: "Social"
        ),
        "metric_bureaucracy": MetricInfo(
            description: "Government inefficiency and red tape. Inverse metric — higher raw values mean worse bureaucracy. A (low bureaucracy) reflects efficient, responsive government services. C indicates moderate procedural friction that slows but doesn't block governance. F (high bureaucracy) represents paralyzed administration where policy implementation stalls indefinitely.",
            factors: ["Administrative reform policy", "Digitization programs", "Government size and spending", "Corruption levels"],
            isInverse: true,
            category: "Governance"
        ),
        "metric_foreign_influence": MetricInfo(
            description: "External influence on domestic affairs by foreign actors. Inverse metric — higher raw values mean greater vulnerability. A (low influence) reflects strong sovereign resilience against external interference. C indicates moderate vulnerability with some foreign leverage. F (high influence) represents heavy foreign manipulation of domestic politics, media, or elections.",
            factors: ["Counterintelligence policy", "Diplomatic alignment", "Media regulation", "Cyber defense capabilities"],
            isInverse: true,
            category: "Security"
        ),
        "metric_economic_bubble": MetricInfo(
            description: "Systemic financial risk from asset bubbles. Inverse metric — higher raw values mean greater risk. A (low risk) reflects stable markets with prudent regulation. C indicates moderate asset inflation with manageable systemic risk. F (high risk) represents imminent financial collapse comparable to 2008 subprime crisis conditions.",
            factors: ["Financial regulation", "Monetary policy", "Real estate and credit market conditions", "Deficit spending"],
            isInverse: true,
            category: "Economic"
        ),
        "metric_housing": MetricInfo(
            description: "Housing affordability and availability. A reflects an affordable market with strong supply meeting demand. C indicates moderate affordability pressure with housing costs around 30% of median income. D signals a housing affordability crisis with growing supply shortfall. F represents severe crisis with widespread homelessness risk and collapsed construction.",
            factors: ["Housing policy and zoning", "Interest rates and mortgage access", "Construction and supply", "Rent regulation"],
            isInverse: false,
            category: "Social"
        ),
        "metric_education": MetricInfo(
            description: "Education system quality and access. A reflects world-leading outcomes with equitable access across demographics. C is adequate but uneven — functional system with achievement gaps typical of mid-OECD rankings. D signals deteriorating outcomes with brain drain risk. F represents systemic education failure with collapsed institutions.",
            factors: ["Education budget", "Teacher workforce policy", "Curriculum reform", "University and research funding"],
            isInverse: false,
            category: "Social"
        ),
        "metric_democracy": MetricInfo(
            description: "Health of democratic institutions — electoral integrity, judicial independence, and legislative function. A reflects robust full democracy with free, fair elections and strong checks on power. C indicates a flawed democracy with institutional weaknesses but functional alternation of power. F represents authoritarian collapse of democratic norms.",
            factors: ["Electoral integrity", "Judicial independence", "Legislative function", "Press freedom"],
            isInverse: false,
            category: "Governance"
        ),
        "metric_sovereignty": MetricInfo(
            description: "Control over domestic affairs free from external coercion. A reflects full sovereign authority with independent policy-making. C indicates some external dependencies and treaty obligations constraining sovereignty. F represents puppet-state conditions with heavy external control over domestic governance.",
            factors: ["Foreign influence countermeasures", "Border control", "Treaty obligations", "Cyber defense"],
            isInverse: false,
            category: "Diplomatic"
        ),
        "metric_immigration": MetricInfo(
            description: "Immigration management and integration. A reflects well-managed immigration that supports economic growth with successful social integration. C indicates moderate tensions with functional but contested policy. F represents immigration crisis — either collapsed border control or total closure causing severe labor shortages.",
            factors: ["Immigration policy", "Economic conditions", "Border enforcement", "Social integration programs"],
            isInverse: false,
            category: "Social"
        ),
    ]
}
