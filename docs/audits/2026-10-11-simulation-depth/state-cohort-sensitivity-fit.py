# Fits STATE_COHORT_SENSITIVITY (packages/engine/src/state-cohort-sensitivity.ts)
# from the Cooperative Election Study Common Content, 2020 and 2024 (Harvard
# Dataverse doi:10.7910/DVN/E9N6PH and doi:10.7910/DVN/X11EP6), retrieved
# 2026-10-11. Standard library only.
#
#   python3 -I state-cohort-sensitivity-fit.py _ out.json \
#     CCES24_Common_OUTPUT_vv_topost_final.csv 2024 CES20_Common_OUTPUT_vv.csv 2020
#
# Prints one line per cohort and writes beta, se, state-years, respondents, the
# group's weighted two-party Republican share and its state-cluster bootstrap
# error to out.json.
import csv, sys, math, random, collections, json

FIPS = {1:"AL",2:"AK",4:"AZ",5:"AR",6:"CA",8:"CO",9:"CT",10:"DE",11:"DC",12:"FL",13:"GA",15:"HI",16:"ID",17:"IL",18:"IN",19:"IA",20:"KS",21:"KY",22:"LA",23:"ME",24:"MD",25:"MA",26:"MI",27:"MN",28:"MS",29:"MO",30:"MT",31:"NE",32:"NV",33:"NH",34:"NJ",35:"NM",36:"NY",37:"NC",38:"ND",39:"OH",40:"OK",41:"OR",42:"PA",44:"RI",45:"SC",46:"SD",47:"TN",48:"TX",49:"UT",50:"VT",51:"VA",53:"WA",54:"WV",55:"WI",56:"WY"}
COLS={
 2024:dict(vote="CC24_410",valid="TS_g2024",validset={1,2,3,4,5,6},gender="gender4",ind="industry",year=2024,
   goods={1,2,3,4,5},front={8,9,10,11,12,13},prof={6,7,14,15},public={16,17}),
 2020:dict(vote="CC20_410",valid="CL_2020gvm",validset={1,2,3,4,5},gender="gender",ind="industryclass",year=2020,
   goods={1,2,3,4,5,6,7},front={8,9,10,16,17,19,20,21,22},prof={11,12,13,14,15,18},public={23}),
}

def num(v):
    try: return int(v)
    except ValueError: return None

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

cells=collections.defaultdict(lambda:[0.0,0.0,0.0,0])  # w_rep, w_total, w^2, n
state=collections.defaultdict(lambda:[0.0,0.0])
nat=collections.defaultdict(lambda:[0.0,0.0])
for path,year in [(sys.argv[i],int(sys.argv[i+1])) for i in range(3,len(sys.argv),2)]:
  C=COLS[year]
  with open(path,newline="") as f:
    for row in csv.DictReader(f):
        if num(row[C["valid"]]) not in C["validset"]: continue
        vote=num(row[C["vote"]])
        if vote not in (1,2): continue
        try: w=float(row["vvweight_post"])
        except ValueError: continue
        if not w>0: continue
        st0=FIPS.get(num(row["inputstate"]))
        if not st0: continue
        # A state-year is one electoral context: 2020 and 2024 each keep their own state share.
        st=(st0,year)
        rep = 1.0 if vote==2 else 0.0
        state[st][0]+=w*rep; state[st][1]+=w
        for g in cohorts(row,C):
            c=cells[(g,st)]; c[0]+=w*rep; c[1]+=w; c[2]+=w*w; c[3]+=1
            nat[g][0]+=w*rep; nat[g][1]+=w

logit=lambda p: math.log(p/(1-p))
MIN_N=5
def points(states):
    pts=collections.defaultdict(list)
    for (g,st),(wr,wt,w2,n) in cells.items():
        if st[0] not in states or n<MIN_N: continue
        neff=wt*wt/w2
        ps=state[st][0]/state[st][1]
        for _ in range(states.count(st[0])):
            pts[g].append((logit(ps),wr/wt*neff,neff))
    return pts

def wls(pts):
    # Binomial GLM by IRLS on (x, successes, trials): no pseudo-counts, so an
    # all-one-party cell neither drops out nor is pulled toward one half.
    a,b=0.0,1.0
    for _ in range(50):
        s00=s01=s11=g0=g1=0.0
        for x,k,t in pts:
            p=1/(1+math.exp(-(a+b*x))); w=t*p*(1-p)
            s00+=w; s01+=w*x; s11+=w*x*x; g0+=k-t*p; g1+=(k-t*p)*x
        det=s00*s11-s01*s01
        da=(s11*g0-s01*g1)/det; db=(s00*g1-s01*g0)/det
        a+=da; b+=db
        if abs(da)+abs(db)<1e-10: break
    return b

allst=sorted({k[0] for k in state})
full=points(allst)
rng=random.Random(20261011)
boots=collections.defaultdict(list)
shares=collections.defaultdict(list)
for _ in range(300):
    sample=[rng.choice(allst) for _ in allst]
    counts=collections.Counter(sample)
    # The group's national two-party share over the resampled states: the baseline's error.
    sums=collections.defaultdict(lambda:[0.0,0.0])
    for (g,st),(wr,wt,_,_) in cells.items():
        k=counts.get(st[0],0)
        if k: sums[g][0]+=k*wr; sums[g][1]+=k*wt
    for g,(wr,wt) in sums.items():
        if wt>0: shares[g].append(wr/wt)
    pts=points(sample)
    for g,p in pts.items():
        if len(p)>=8: boots[g].append(wls(p)-1)
res={}
for g in sorted(full):
    b=wls(full[g])-1; bs=sorted(boots[g]); m=sum(bs)/len(bs)
    se=math.sqrt(sum((x-m)**2 for x in bs)/(len(bs)-1))
    nstates=len(full[g]); nresp=sum(v[3] for (gg,_),v in cells.items() if gg==g)
    sh=shares[g]; sm=sum(sh)/len(sh); rse=math.sqrt(sum((x-sm)**2 for x in sh)/(len(sh)-1))
    res[g]=dict(beta=round(b,3),se=round(se,3),states=nstates,n=nresp,rep=round(nat[g][0]/nat[g][1],3),rep_se=round(rse,3))
    print(f"{g:24s} beta={b:+.3f} se={se:.3f} states={nstates:2d} n={nresp:6d} rep2p={nat[g][0]/nat[g][1]:.3f} se={rse:.3f}")
json.dump(res,open(sys.argv[2],"w"),indent=1)
