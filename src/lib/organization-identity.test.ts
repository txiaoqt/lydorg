import { describe, expect, it } from 'vitest';
import { normalizeOrganizationName, identityOutcomeMessage } from './organization-identity';
describe('organization name identity normalization',()=>{
  it.each(['Palatiw Youth Organization',' PALATIW  YOUTH ORGANIZATION ','Palatiw Youth Org.','Ｐａｌａｔｉｗ Youth Organization'])('equivalent candidate key: %s',name=>expect(normalizeOrganizationName(name)).toBe('palatiw youth organization'));
  it('preserves distinct organizations and avoids inherited alias properties',()=>{
    expect(normalizeOrganizationName('Constructor Youth Club')).toBe('constructor youth club');
    expect(normalizeOrganizationName('Palatiw Youth Volunteers')).not.toBe(normalizeOrganizationName('Palatiw Youth Organization'));
  });
  it('does not describe a name match as proof or reveal private records',()=>{
    expect(identityOutcomeMessage.POSSIBLE_MATCH).toContain('Similar names can belong to different organizations');
    expect(identityOutcomeMessage.CHECK_UNAVAILABLE).toContain('pending');
    expect(identityOutcomeMessage.EXACT_URN_CONFLICT).toContain('account recovery');
  });
});
