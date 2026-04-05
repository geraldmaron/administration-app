import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { GeopoliticalProfile, CountryRelationship } from '@/types/geopolitical';

export const dynamic = 'force-dynamic';

function relationshipsToCsv(rels: CountryRelationship[], relationType: string): string {
  if (!rels.length) return '';
  const header = 'countryId,type,strength,treaty,sharedBorder';
  const rows = rels.map(r =>
    `${r.countryId},${r.type},${r.strength},"${r.treaty ?? ''}",${r.sharedBorder}`
  );
  return [header, ...rows].join('\n');
}

function geopoliticalToJson(geo: GeopoliticalProfile | null): object {
  return geo ?? { allies: [], adversaries: [], neighbors: [], tags: [], governmentCategory: '', regimeStability: 0 };
}

function geopoliticalToCsv(geo: GeopoliticalProfile | null): string {
  if (!geo) return '';
  const parts: string[] = [];

  const alliesCsv = relationshipsToCsv(geo.allies, 'ally');
  if (alliesCsv) parts.push(`# Allies\n${alliesCsv}`);

  const adversariesCsv = relationshipsToCsv(geo.adversaries, 'adversary');
  if (adversariesCsv) parts.push(`# Adversaries\n${adversariesCsv}`);

  const neighborsCsv = relationshipsToCsv(geo.neighbors, 'neighbor');
  if (neighborsCsv) parts.push(`# Neighbors\n${neighborsCsv}`);

  return parts.join('\n\n');
}

function geopoliticalToYaml(geo: GeopoliticalProfile | null): string {
  if (!geo) return 'geopolitical: {}\n';

  const relToYaml = (rels: CountryRelationship[]) => {
    if (!rels.length) return '  []';
    return rels.map(r => {
      const lines = [`  - countryId: "${r.countryId}"`, `    type: ${r.type}`, `    strength: ${r.strength}`];
      if (r.treaty) lines.push(`    treaty: "${r.treaty}"`);
      lines.push(`    sharedBorder: ${r.sharedBorder}`);
      return lines.join('\n');
    }).join('\n');
  };

  return [
    `governmentCategory: ${geo.governmentCategory}`,
    `regimeStability: ${geo.regimeStability}`,
    `tags:`,
    geo.tags.length ? geo.tags.map(t => `  - "${t}"`).join('\n') : '  []',
    `allies:`,
    relToYaml(geo.allies),
    `adversaries:`,
    relToYaml(geo.adversaries),
    `neighbors:`,
    relToYaml(geo.neighbors),
  ].join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  const { countryId } = await params;
  const format = new URL(request.url).searchParams.get('format') || 'json';

  try {
    const snap = await db.collection('countries').doc(countryId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const name: string = data.name ?? snap.id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const geo = data.geopolitical as GeopoliticalProfile | null;

    if (format === 'csv') {
      const csv = geopoliticalToCsv(geo);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${countryId}_geopolitical.csv"`,
        },
      });
    }

    if (format === 'yaml') {
      const yaml = geopoliticalToYaml(geo);
      return new NextResponse(yaml, {
        headers: {
          'Content-Type': 'text/yaml',
          'Content-Disposition': `attachment; filename="${countryId}_geopolitical.yaml"`,
        },
      });
    }

    return NextResponse.json({
      id: countryId,
      name,
      region: data.region ?? '',
      geopolitical: geo ?? { allies: [], adversaries: [], neighbors: [], tags: [], governmentCategory: '', regimeStability: 0 },
    });
  } catch (err) {
    console.error(`GET /api/countries/${countryId}/geopolitical/export error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
