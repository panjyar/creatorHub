import { calculateAdditionalPayout, calculatePayout, getAllocatablePayout, validateMilestones } from '../src/services/payout';

const milestones = [{ views: 10_000, payout: 500 }, { views: 50_000, payout: 2_000 }, { views: 100_000, payout: 5_000 }];

describe('calculatePayout', () => {
  it('returns zero below the first milestone', () => expect(calculatePayout(9_999, milestones)).toBe(0));
  it('pays at an exact milestone boundary', () => expect(calculatePayout(10_000, milestones)).toBe(500));
  it('returns the highest milestone, not the sum of milestones', () => expect(calculatePayout(60_000, milestones)).toBe(2_000));
  it('returns the highest payout for 100k views', () => expect(calculatePayout(100_000, milestones)).toBe(5_000));
});

describe('calculateAdditionalPayout', () => {
  it('subtracts payout already allocated', () => expect(calculateAdditionalPayout(100_000, milestones, 2_000)).toBe(3_000));
  it('does not pay again for a repeated update', () => expect(calculateAdditionalPayout(60_000, milestones, 2_000)).toBe(0));
});

describe('validateMilestones', () => {
  it('rejects thresholds that are not strictly increasing', () => expect(validateMilestones([{ views: 100, payout: 10 }, { views: 100, payout: 20 }])).toBeTruthy());
  it('rejects decreasing payouts', () => expect(validateMilestones([{ views: 100, payout: 20 }, { views: 200, payout: 10 }])).toBeTruthy());
  it('accepts a valid ladder', () => expect(validateMilestones(milestones)).toBeNull());
});

describe('getAllocatablePayout budget cap', () => {
  it('allows a payout that fits the remaining budget', () => expect(getAllocatablePayout(500, 500)).toBe(500));
  it('rejects the entire increment if it exceeds remaining budget', () => expect(getAllocatablePayout(800, 500)).toBe(0));
  it('does not allocate negative payouts', () => expect(getAllocatablePayout(-10, 500)).toBe(0));
});
