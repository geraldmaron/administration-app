# Measures, from the Cooperative Election Study Common Content 2020 and 2024
# (Harvard Dataverse doi:10.7910/DVN/E9N6PH and doi:10.7910/DVN/X11EP6, CC0,
# retrieved 2026-10-12), three things the contested-issues program needs:
#
#   1. each state's adult share by religious tradition (seven traditions);
#   2. each tradition's two-party presidential share among validated voters;
#   3. each cohort's measured support on the policy items both years ask, and a
#      cultural-axis reading built from those answers.
#
# Standard library only. The cohort definitions are copied unchanged from
# docs/audits/2026-10-11-simulation-depth/state-cohort-sensitivity-fit.py so a
# cohort here is the same people the partisan baseline was fitted on.
#
#   python3 -I religion-issue-fit.py out.json \
#     CCES24_Common_OUTPUT_vv_topost_final.csv 2024 CES20_Common_OUTPUT_vv.csv 2020
import csv, sys, math, random, collections, json

FIPS = {1:"AL",2:"AK",4:"AZ",5:"AR",6:"CA",8:"CO",9:"CT",10:"DE",11:"DC",12:"FL",13:"GA",15:"HI",16:"ID",17:"IL",18:"IN",19:"IA",20:"KS",21:"KY",22:"LA",23:"ME",24:"MD",25:"MA",26:"MI",27:"MN",28:"MS",29:"MO",30:"MT",31:"NE",32:"NV",33:"NH",34:"NJ",35:"NM",36:"NY",37:"NC",38:"ND",39:"OH",40:"OK",41:"OR",42:"PA",44:"RI",45:"SC",46:"SD",47:"TN",48:"TX",49:"UT",50:"VT",51:"VA",53:"WA",54:"WV",55:"WI",56:"WY"}
# Census divisions: the pool a thin state's share is shrunk toward.
DIVISION = {}
for div, states in {
    "new-england": "CT ME MA NH RI VT", "mid-atlantic": "NJ NY PA",
    "east-north-central": "IL IN MI OH WI", "west-north-central": "IA KS MN MO NE ND SD",
    "south-atlantic": "DE DC FL GA MD NC SC VA WV", "east-south-central": "AL KY MS TN",
    "west-south-central": "AR LA OK TX", "mountain": "AZ CO ID MT NV NM UT WY",
    "pacific": "AK CA HI OR WA"}.items():
    for s in states.split(): DIVISION[s] = div

COLS={
 2024:dict(vote="CC24_410",valid="TS_g2024",validset={1,2,3,4,5,6},gender="gender4",ind="industry",year=2024,
   goods={1,2,3,4,5},front={8,9,10,11,12,13},prof={6,7,14,15},public={16,17}),
 2020:dict(vote="CC20_410",valid="CL_2020gvm",validset={1,2,3,4,5},gender="gender",ind="industryclass",year=2020,
   goods={1,2,3,4,5,6,7},front={8,9,10,16,17,19,20,21,22},prof={11,12,13,14,15,18},public={23}),
}

# Policy items. `prog` is the answer (1 support, 2 oppose) that sits on the
# progressive end of the cultural axis; None keeps an item out of that reading.
ITEMS = {
  "abortion-always-allow":   dict(y2020="CC20_332a", y2024="CC24_324a", prog=1),
  "abortion-rape-incest-only": dict(y2020="CC20_332b", y2024="CC24_324b", prog=2),
  "abortion-illegal-always": dict(y2020="CC20_332f", y2024="CC24_324c", prog=2),
  "guns-assault-ban":        dict(y2020="CC20_330b", y2024="CC24_321a", prog=1),
  "guns-easier-carry":       dict(y2020="CC20_330c", y2024="CC24_321b", prog=2),
  "imm-legal-status":        dict(y2020="CC20_331a", y2024="CC24_323a", prog=None),
  "imm-border-patrols":      dict(y2020="CC20_331b", y2024="CC24_323b", prog=None),
  "police-plus-ten":         dict(y2020="CC20_334c", y2024="CC24_321d", prog=None),
  # One year only: no same-wording pair exists, so these are reported per year.
  "lgbt-nondiscrimination-2020": dict(y2020="CC20_350a", y2024=None, prog=1),
  "trans-military-ban-2020":     dict(y2020="CC20_355d", y2024=None, prog=2),
  "marriage-recognition-2024":   dict(y2020=None, y2024="CC24_340c", prog=1),
}
# Published religious mix by race and ethnicity, mapped to the seven
# traditions (PUBLISHED-TOPLINES.md Part A: Pew RLS 2023-24, with the White
# and Asian rows derived). CES leans secular, most of all among Black
# respondents, so each race group's mix is raked to these before state shares
# are read. Each row is normalized, so a group's size in a state is kept.
# Hispanic and Asian Protestants are "other Christian" under this mapping.
RAKE_TARGETS = {
  "race-white":    {"evangelical-protestant":26,"mainline-protestant":14,"black-protestant":0,"catholic":17,"other-christian":4,"other-faith":4,"unaffiliated":30},
  "race-black":    {"evangelical-protestant":0,"mainline-protestant":0,"black-protestant":65,"catholic":4,"other-christian":4,"other-faith":4,"unaffiliated":22},
  "race-hispanic": {"evangelical-protestant":0,"mainline-protestant":0,"black-protestant":0,"catholic":42,"other-christian":25,"other-faith":5,"unaffiliated":28},
  "race-asian":    {"evangelical-protestant":0,"mainline-protestant":0,"black-protestant":0,"catholic":12,"other-christian":22,"other-faith":34,"unaffiliated":32},
}

def race_group(row):
    race=num(row["race"]); hisp=row["hispanic"]=="1"
    if race==3 or hisp: return "race-hispanic"
    return {1:"race-white",2:"race-black",4:"race-asian"}.get(race,"race-other")

TRADITIONS = ["evangelical-protestant","mainline-protestant","black-protestant","catholic","other-christian","other-faith","unaffiliated"]

def num(v):
    try: return int(v)
    except (ValueError, TypeError): return None

def cohorts(row,C):
    out=[]
    by=num(row["birthyr"]); age = C["year"]-by if by else None
    if age is not None:
        out.append("age-under-35" if age<35 else "age-35-64" if age<65 else "age-65-plus")
    inc=num(row["faminc_new"])
    if inc and inc<=16:
        out.append("income-struggling" if inc<=4 else "income-affluent" if inc>=12 else "income-comfortable")
    ed=num(row["educ"])
    if ed: out.append("degree" if ed>=5 else "no-degree")
    uc=num(row["urbancity"])
    if uc in (1,2,3,4): out.append({1:"urban",2:"suburban",3:"rural",4:"rural"}[uc])
    emp=num(row["employ"]); ind=num(row[C["ind"]])
    if row["milstat_1"]=="1": out.append("public-and-uniformed")
    elif emp in (1,2,3,4) and ind:
        out.append("goods-producing" if ind in C["goods"] else "frontline-services" if ind in C["front"] else "professional-technical" if ind in C["prof"] else "public-and-uniformed" if ind in C["public"] else "not-in-the-workforce")
    elif emp in (5,6,7,8,9) or (emp in (3,4) and not ind):
        out.append("not-in-the-workforce")
    race=num(row["race"]); hisp=row["hispanic"]=="1"
    if race:
        out.append("race-hispanic" if (race==3 or hisp) else {1:"race-white",2:"race-black",4:"race-asian"}.get(race,"race-other"))
    g=num(row[C["gender"]])
    if g in (1,2): out.append("sex-male" if g==1 else "sex-female")
    im=num(row["immstat"])
    if im: out.append("foreign-born" if im in (1,2) else "us-born")
    if emp: out.append("with-disability" if emp==6 else "no-disability")
    out.append("veteran" if row["milstat_3"]=="1" else "non-veteran")
    return out

CHRISTIAN_WORDS = ("christ","chris","baptist","born again","methodist","lutheran","pentecost","non denom","nondenom","evangelical","presbyter","church","protestant","apostolic","bible","jesus")
OTHER_FAITH_WORDS = ("pagan","wicca","satan","spiritual","unitarian","druid","heathen","norse","taoi","sikh","jain","bahai","baha'i","shinto")

def protestant_by_race(white, black, born):
    if black: return "black-protestant"
    if white: return "evangelical-protestant" if born else "mainline-protestant"
    return "other-christian"

def tradition(row):
    # Pew/PRRI convention: Protestants split by race and the born-again answer.
    # CES records about three times Pew's share of "something else", most of
    # it with no write-in. A write-in that names a Christian group is coded as
    # that group, and one naming another practice goes to other faiths. With
    # no write-in, a born-again answer or attending monthly or more reads as
    # Christian by race; seldom or never reads as unaffiliated.
    rel=num(row["religpew"]); race=num(row["race"]); hisp=row["hispanic"]=="1"
    born=num(row["pew_bornagain"])==1
    white = race==1 and not hisp; black = race==2 and not hisp
    if rel==1: return protestant_by_race(white, black, born)
    if rel==2: return "catholic"
    if rel in (3,4): return "other-christian"
    if rel in (5,6,7,8): return "other-faith"
    if rel in (9,10,11): return "unaffiliated"
    if rel==12:
        text=(row.get("religpew_t") or "").strip().lower()
        if text in ("__na__","none","nothing"): text=""
        if "catholic" in text: return "catholic"
        if any(w in text for w in CHRISTIAN_WORDS): return protestant_by_race(white, black, born)
        if text: return "other-faith"
        if born or num(row["pew_churatd"]) in (1,2,3): return protestant_by_race(white, black, born)
        return "unaffiliated"
    return None

def fnum(v):
    try: return float(v)
    except (ValueError, TypeError): return None

adult = collections.defaultdict(float)            # (state, trad) -> weight
adult_n = collections.Counter()                   # (state, trad) -> respondents
adult_r = collections.defaultdict(float)          # (state, race group, trad) -> weight
state_w = collections.defaultdict(float); state_w2 = collections.defaultdict(float)
something_else = collections.Counter()
vote = collections.defaultdict(lambda:[0.0,0.0])  # (trad, (state,year)) -> [w_rep, w]
item = collections.defaultdict(lambda:[0.0,0.0,0.0,0])  # (group, item, year) -> [w_yes, w, w^2, n]

for path,year in [(sys.argv[i],int(sys.argv[i+1])) for i in range(2,len(sys.argv),2)]:
    C=COLS[year]
    with open(path,newline="") as f:
        for row in csv.DictReader(f):
            st=FIPS.get(num(row["inputstate"]))
            if not st: continue
            t=tradition(row)
            if num(row["religpew"])==12: something_else[(year,t)]+=1
            w=fnum(row["commonweight"])
            if w and w>0 and t:
                adult[(st,t)]+=w; adult_n[(st,t)]+=1; adult_r[(st,race_group(row),t)]+=w
                state_w[st]+=w; state_w2[st]+=w*w
                groups=cohorts(row,C)+[t]
                for name,spec in ITEMS.items():
                    col=spec["y2020"] if year==2020 else spec["y2024"]
                    if not col: continue
                    a=num(row.get(col))
                    if a not in (1,2): continue
                    for g in groups+["all-adults"]:
                        c=item[(g,name,year)]; c[0]+=w*(a==1); c[1]+=w; c[2]+=w*w; c[3]+=1
            if t and num(row[C["valid"]]) in C["validset"] and num(row[C["vote"]]) in (1,2):
                vw=fnum(row["vvweight_post"])
                if vw and vw>0:
                    v=vote[(t,(st,year))]; v[0]+=vw*(num(row[C["vote"]])==2); v[1]+=vw

# 1. State shares, shrunk toward the division with weight neff/(neff+K).
K=150.0
div_w=collections.defaultdict(float); div_tot=collections.defaultdict(float)
for (st,t),w in adult.items(): div_w[(DIVISION[st],t)]+=w; div_tot[DIVISION[st]]+=w
nat_w=collections.defaultdict(float)
for (st,t),w in adult.items(): nat_w[t]+=w
nat_tot=sum(nat_w.values())
states={}
for st in sorted(state_w):
    neff=state_w[st]**2/state_w2[st]; lam=neff/(neff+K); d=DIVISION[st]
    raw={t:adult.get((st,t),0.0)/state_w[st] for t in TRADITIONS}
    shr={t:lam*raw[t]+(1-lam)*div_w[(d,t)]/div_tot[d] for t in TRADITIONS}
    tot=sum(shr.values()); shr={t:v/tot for t,v in shr.items()}
    se={t:math.sqrt(max(raw[t]*(1-raw[t]),1e-9)/neff) for t in TRADITIONS}
    states[st]=dict(n=sum(adult_n[(st,t)] for t in TRADITIONS),neff=round(neff),shrink_weight=round(lam,3),
                    share={t:round(shr[t],4) for t in TRADITIONS},raw={t:round(raw[t],4) for t in TRADITIONS},
                    raw_se={t:round(se[t],4) for t in TRADITIONS})

# 1b. Raked: each race group's national mix scaled to its published mix.
ces_mix=collections.defaultdict(lambda:collections.defaultdict(float))
for (st,rg,t),w in adult_r.items(): ces_mix[rg][t]+=w
factor={}
for rg,mix in ces_mix.items():
    tot=sum(mix.values()); tgt=RAKE_TARGETS.get(rg)
    for t in TRADITIONS:
        if not tgt: factor[(rg,t)]=1.0; continue
        share=mix.get(t,0.0)/tot; want=tgt[t]/sum(tgt.values())
        factor[(rg,t)]=want/share if share>0 else 0.0
raked_state=collections.defaultdict(float)
for (st,rg,t),w in adult_r.items(): raked_state[(st,t)]+=w*factor[(rg,t)]
raked_div=collections.defaultdict(float); raked_divtot=collections.defaultdict(float); raked_nat=collections.defaultdict(float)
for (st,t),w in raked_state.items():
    raked_div[(DIVISION[st],t)]+=w; raked_divtot[DIVISION[st]]+=w; raked_nat[t]+=w
for st in states:
    tot=sum(raked_state[(st,t)] for t in TRADITIONS); lam=states[st]["shrink_weight"]; d=DIVISION[st]
    shr={t:lam*raked_state[(st,t)]/tot+(1-lam)*raked_div[(d,t)]/raked_divtot[d] for t in TRADITIONS}
    norm=sum(shr.values())
    states[st]["raked_share"]={t:round(v/norm,4) for t,v in shr.items()}
raked_nat_tot=sum(raked_nat.values())

# 2. Two-party Republican share by tradition, state-cluster bootstrap.
allst=sorted(state_w); rng=random.Random(20261012)
def rep_share(counts):
    s=collections.defaultdict(lambda:[0.0,0.0])
    for (t,(st,_)),(wr,wt) in vote.items():
        k=counts.get(st,0)
        if k: s[t][0]+=k*wr; s[t][1]+=k*wt
    return {t:wr/wt for t,(wr,wt) in s.items() if wt>0}
full=rep_share({s:1 for s in allst}); boots=collections.defaultdict(list)
for _ in range(300):
    for t,v in rep_share(collections.Counter(rng.choice(allst) for _ in allst)).items(): boots[t].append(v)
def sd(xs):
    m=sum(xs)/len(xs); return math.sqrt(sum((x-m)**2 for x in xs)/(len(xs)-1))
baseline={t:dict(rep2p=round(full[t],3),se=round(sd(boots[t]),3),
                 voters=round(sum(wt for (tt,_),(_,wt) in vote.items() if tt==t))) for t in TRADITIONS}

# 3. Item support per group, pooled across years where both ask it, and per year.
positions=collections.defaultdict(dict)
for g in sorted({k[0] for k in item}):
    for name in ITEMS:
        per={}
        for y in (2020,2024):
            c=item.get((g,name,y))
            if c and c[1]>0:
                p=c[0]/c[1]; neff=c[1]**2/c[2]
                per[y]=dict(support=round(p,3),se=round(math.sqrt(p*(1-p)/neff),3),n=c[3])
        if not per: continue
        if len(per)==2:
            cs=[item[(g,name,y)] for y in (2020,2024)]
            p=sum(c[0] for c in cs)/sum(c[1] for c in cs)
            neff=sum(c[1] for c in cs)**2/sum(c[2] for c in cs)
            per["pooled"]=dict(support=round(p,3),se=round(math.sqrt(p*(1-p)/neff),3),n=sum(c[3] for c in cs))
        positions[g][name]=per

# Cultural reading: the mean, over the items that carry one, of the share
# answering on the progressive side, mapped to -1 (traditional) .. +1
# (progressive). A transparent average, not a fitted scale.
def cultural(g):
    vals=[]
    for name,spec in ITEMS.items():
        if spec["prog"] is None or name not in positions[g]: continue
        per=positions[g][name]; p=(per.get("pooled") or per.get(2024) or per.get(2020))["support"]
        vals.append(p if spec["prog"]==1 else 1-p)
    return round(2*sum(vals)/len(vals)-1,3) if vals else None
culture={g:cultural(g) for g in positions}

out=dict(source="CES Common Content 2020 (doi:10.7910/DVN/E9N6PH) and 2024 (doi:10.7910/DVN/X11EP6), CC0, retrieved 2026-10-12",
         shrink_k=K,national_share={t:round(nat_w[t]/nat_tot,4) for t in TRADITIONS},
         raked_national_share={t:round(raked_nat[t]/raked_nat_tot,4) for t in TRADITIONS},rake_targets=RAKE_TARGETS,
         something_else={f"{y}:{t}":n for (y,t),n in sorted(something_else.items(),key=str)},
         states=states,baseline=baseline,positions=positions,cultural=culture)
json.dump(out,open(sys.argv[1],"w"),indent=1)
print("national share:",{t:round(nat_w[t]/nat_tot,3) for t in TRADITIONS})
print("raked national share:",{t:round(raked_nat[t]/raked_nat_tot,3) for t in TRADITIONS})
print("baseline:",{t:(b["rep2p"],b["se"]) for t,b in baseline.items()})
print("cultural:",dict(sorted(culture.items(),key=lambda kv:kv[1])))
