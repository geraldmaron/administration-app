import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { GeopoliticalProfile, CountryRelationship } from '@/types/geopolitical';

export const dynamic = 'force-dynamic';

function relToCsvRow(r: CountryRelationship): string {
  return `${r.countryId},${r.type},${r.strength},"${r.treaty ?? ''}",${r.sharedBorder}`;
}

export async function GET(request: NextRequest) {
  const format = new URL(request.url).searchParams.get('format') || 'json';

  try {
    const snap = await db.collection('countries').orderBy('name', 'asc').get();
    const results: Array<{ id: string; name: string; region: string; geopolitical: GeopoliticalProfile | null }> = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const name: string = data.name ?? doc.id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      results.push({
        id: doc.id,
        name,
        region: data.region ?? '',
        geopolitical: (data.geopolitical as GeopoliticalProfile | null) ?? null,
      });
    }

    if (format === 'csv') {
      const header = 'countryId,countryName,region,governmentCategory,regimeStability,tags,alliesCount,adversariesCount,neighborsCount';
      const rows = results.map(r => {
        const geo = r.geopolitical;
        return [
          r.id,
          `"${r.name}"`,
          r.region,
          geo?.governmentCategory ?? '',
          geo?.regimeStability ?? 0,
          `"${(geo?.tags ?? []).join('; ')}"`,
          geo?.allies.length ?? 0,
          geo?.adversaries.length ?? 0,
          geo?.neighbors.length ?? 0,
        ].join(',');
      });

      let csv = [header, ...rows].join('\n');
      csv += '\n\n# Allies\n';
      csv += 'sourceCountryId,targetCountryId,type,strength,treaty,sharedBorder\n';
      for (const r of results) {
        for (const rel of (r.geopolitical?.allies ?? [])) {
          csv += `${r.id},${relToCsvRow(rel)}\n`;
        }
      }
      csv += '\n# Adversaries\n';
      csv += 'sourceCountryId,targetCountryId,type,strength,treaty,sharedBorder\n';
      for (const r of results) {
        for (const rel of (r.geopolitical?.adversaries ?? [])) {
          csv += `${r.id},${relToCsvRow(rel)}\n`;
        }
      }
      csv += '\n# Neighbors\n';
      csv += 'sourceCountryId,targetCountryId,type,strength,treaty,sharedBorder\n';
      for (const r of results) {
        for (const rel of (r.geopolitical?.neighbors ?? [])) {
          csv += `${r.id},${relToCsvRow(rel)}\n`;
        }
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="all_countries_geopolitical.csv"',
        },
      });
    }

    if (format === 'yaml') {
      const yamlLines: string[] = ['countries:'];
      for (const r of results) {
        const geo = r.geopolitical;
        yamlLines.push(`  ${r.id}:`);
        yamlLines.push(`    name: "${r.name}"`);
        yamlLines.push(`    region: ${r.region}`);
        if (geo) {
          yamlLines.push(`    governmentCategory: ${geo.governmentCategory}`);
          yamlLines.push(`    regimeStability: ${geo.regimeStability}`);
          yamlLines.push(`    tags:`);
          yamlLines.push(geo.tags.length ? geo.tags.map(t => `      - "${t}"`).join('\n') : '      []');
          yamlLines.push(`    allies:`);
          yamlLines.push(geo.allies.length ? geo.allies.map(a => `      - { countryId: "${a.countryId}", type: ${a.type}, strength: ${a.strength} }`).join('\n') : '      []');
          yamlLines.push(`    adversaries:`);
          yamlLines.push(geo.adversaries.length ? geo.adversaries.map(a => `      - { countryId: "${a.countryId}", type: ${a.type}, strength: ${a.strength} }`).join('\n') : '      []');
          yamlLines.push(`    neighbors:`);
          yamlLines.push(geo.neighbors.length ? geo.neighbors.map(a => `      - { countryId: "${a.countryId}", type: ${a.type}, strength: ${a.strength} }`).join('\n') : '      []');
        } else {
          yamlLines.push(`    geopolitical: {}`);
        }
      }

      return new NextResponse(yamlLines.join('\n'), {
        headers: {
          'Content-Type': 'text/yaml',
          'Content-Disposition': 'attachment; filename="all_countries_geopolitical.yaml"',
        },
      });
    }

    return NextResponse.json({ countries: results });
  } catch (err) {
    console.error('GET /api/countries/geopolitical/export-all error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
