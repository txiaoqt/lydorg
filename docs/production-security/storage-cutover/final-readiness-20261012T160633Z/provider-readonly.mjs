// Read-only provider identity check. Does not deploy, promote, or read credentials.
import fs from 'node:fs/promises';
import {api, alias, project, teamId, admin, org} from '../../../../.agent/organization-promotion-20261012T144752Z/common.mjs';

const expected = {
  admin: 'dpl_AZ287kU35oFTVqyTEQRf749qncAA',
  organization: 'dpl_9cdS7dktgbw9PkhiewmzXn3nPFNQ',
};
const endpoints = [
  '/v4/aliases/y-trace-admin.vercel.app',
  '/v4/aliases/ytrace.app',
  '/v13/deployments/' + expected.admin,
  '/v13/deployments/' + expected.organization,
  '/v9/projects/' + admin,
  '/v9/projects/' + org,
];
try {
  const results = [];
  for (const endpoint of endpoints) results.push(await api(endpoint));
  const [adminAlias, organizationAlias, adminDeployment, organizationDeployment, adminProject, organizationProject] = results;
  const deployment = d => ({id: d.id, projectId: d.projectId, ownerId: d.ownerId, url: d.url, readyState: d.readyState, target: d.target, createdAt: d.createdAt, ready: d.ready});
  const checks = {
    adminAlias: alias(adminAlias).deploymentId === expected.admin && adminAlias.projectId === admin,
    organizationAlias: alias(organizationAlias).deploymentId === expected.organization && organizationAlias.projectId === org,
    adminReady: adminDeployment.id === expected.admin && adminDeployment.projectId === admin && adminDeployment.ownerId === teamId && adminDeployment.readyState === 'READY',
    organizationReady: organizationDeployment.id === expected.organization && organizationDeployment.projectId === org && organizationDeployment.ownerId === teamId && organizationDeployment.readyState === 'READY',
    adminProject: adminProject.id === admin && adminProject.accountId === teamId && adminProject.targets?.production?.id === expected.admin,
    organizationProject: organizationProject.id === org && organizationProject.accountId === teamId && organizationProject.targets?.production?.id === expected.organization,
  };
  const evidence = {capturedAt: new Date().toISOString(), readOnly: true, status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL', checks,
    aliases: [alias(adminAlias), alias(organizationAlias)], deployments: [deployment(adminDeployment), deployment(organizationDeployment)], projects: [project(adminProject), project(organizationProject)],
    scope: 'Provider metadata only; no deployment, promotion, environment reads, browser login, or business requests.'};
  await fs.writeFile(new URL('./provider-identity.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify(evidence));
  if (evidence.status !== 'PASS') process.exitCode = 2;
} catch {
  console.log(JSON.stringify({status: 'BLOCKED', reason: 'READ_ONLY_PROVIDER_IDENTITY_CHECK_FAILED', automaticRetries: 0}));
  process.exitCode = 2;
}
