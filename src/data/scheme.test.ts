import { describe, expect, it } from 'vitest';
import { SCHEME, SITE_VISIT, SAMPLE_TIERS } from './seed';
import { HOUSE_DESIGNS } from '../lib/validation';

/**
 * Pins the seeded figures to the cooperative's call document as recorded in
 * design/SCHEME_FACTS.md. If the cooperative revises the call, update the facts
 * file, then this test, then the seed — not the other way round.
 */
describe('scheme facts from the call document', () => {
  it('prices plots at ₦27,000 per square metre', () => {
    expect(SCHEME.pricePerSqm).toBe(27_000);
  });

  it('charges a ₦20,000 application fee', () => {
    expect(SCHEME.applicationFee).toBe(20_000);
  });

  it('closes applications on 30 December 2026', () => {
    expect(SCHEME.closesOn).toBe('2026-12-30');
  });

  it('takes the 50% deposit by 30 January 2027 and the balance by 30 June 2027', () => {
    expect(SCHEME.depositDueOn).toBe('2027-01-30');
    expect(SCHEME.balanceDueOn).toBe('2027-06-30');
  });

  it('inventories 4 x 200, 44 x 300, 44 x 400 and 10 x 500 sqm plots', () => {
    expect(SAMPLE_TIERS.map((tier) => [tier.sizeSqm, tier.totalPlots])).toEqual([
      [200, 4],
      [300, 44],
      [400, 44],
      [500, 10],
    ]);
    expect(SAMPLE_TIERS.reduce((sum, tier) => sum + tier.totalPlots, 0)).toBe(102);
  });

  it('offers exactly the two 4-bedroom designs in the document', () => {
    expect(HOUSE_DESIGNS.map((design) => design.id)).toEqual(['semi-detached', 'detached']);
    for (const design of HOUSE_DESIGNS) expect(design.label).toMatch(/^4-bedroom/);
  });

  it('runs the site visits on 28 November and 5 December 2026 from 10:00 am', () => {
    expect([...SITE_VISIT.dates]).toEqual(['2026-11-28', '2026-12-05']);
    expect(SITE_VISIT.time).toBe('10:00 am');
    expect(SITE_VISIT.meetingPoint).toMatch(/National Ecumenical Centre/);
  });

  it('names the estate as Gidan Daya near Loyola Jesuit College', () => {
    expect(SCHEME.location).toMatch(/Gidan Daya/);
    expect(SCHEME.location).toMatch(/Loyola Jesuit College/);
  });
});
