import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessDomain, getHighestRole, hasAnyRole, hasPermission } from '../src/utils/authorization.js';

test('highest role is chosen by privilege rank, independent of input order', () => {
  assert.equal(getHighestRole(['member', 'domain_admin', 'admin']), 'admin');
  assert.equal(getHighestRole(['super_admin', 'member']), 'super_admin');
  assert.equal(getHighestRole([]), 'member');
});

test('permission checks require an explicit grant unless wildcard is present', () => {
  assert.equal(hasPermission(['post:create', 'post:submit'], 'post:submit'), true);
  assert.equal(hasPermission(['post:create'], 'post:approve'), false);
  assert.equal(hasPermission(['*'], 'settings:manage'), true);
});

test('role checks match any allowed role', () => {
  assert.equal(hasAnyRole(['member', 'domain_admin'], ['admin', 'domain_admin']), true);
  assert.equal(hasAnyRole(['member'], ['admin', 'super_admin']), false);
});

test('domain administrators are limited to assigned domains', () => {
  const actor = { roles: ['domain_admin', 'member'], domainIds: ['domain-a'] };
  assert.equal(canAccessDomain(actor, 'domain-a'), true);
  assert.equal(canAccessDomain(actor, 'domain-b'), false);
  assert.equal(canAccessDomain({ roles: ['admin'], domainIds: [] }, 'domain-b'), true);
  assert.equal(canAccessDomain({ roles: ['member'], domainIds: [] }, 'domain-b'), false);
});
