import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INSTALLATION_STATES,
  canTransitionInstallation,
  validateInstallationTransition,
} from '../src/domain/installationStatus.js';
import { can } from '../src/domain/permissions.js';

test('allows an assigned installation to start only after acceptance', () => {
  assert.equal(canTransitionInstallation('Assigned', 'Accepted'), true);
  assert.equal(canTransitionInstallation('Assigned', 'In Progress'), false);
});

test('rejects completion without customer verification', () => {
  assert.throws(
    () => validateInstallationTransition('Awaiting Verification', 'Completed', { otpVerified: false }),
    /customer verification/i,
  );
});

test('allows completion after customer verification', () => {
  assert.equal(
    validateInstallationTransition('Awaiting Verification', 'Completed', { otpVerified: true }),
    true,
  );
});

test('restricts technician actions to the assigned technician', () => {
  const user = { id: 'tech-1', role: 'Carpenter' };
  assert.equal(can(user, 'installation.start', { assignedTechnicianId: 'tech-1' }), true);
  assert.equal(can(user, 'installation.start', { assignedTechnicianId: 'tech-2' }), false);
});

test('exports a finite canonical state list', () => {
  assert.ok(INSTALLATION_STATES.includes('Completed'));
  assert.equal(new Set(INSTALLATION_STATES).size, INSTALLATION_STATES.length);
});
