import React from 'react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { ApprovalQueue } from '../ApprovalQueue';
import { EventItem } from '../../types/event';

describe('ApprovalQueue component', () => {
  const mockEvents: EventItem[] = [
    {
      id: 'e1',
      universityId: 'u1',
      organizerId: 'org1',
      organizationId: null,
      departmentId: 'dept1',
      venueId: null,
      title: 'Test Event',
      description: 'Description',
      category: 'TECHNICAL',
      startTime: '2026-12-01T10:00:00Z',
      endTime: '2026-12-01T12:00:00Z',
      registrationDeadline: '2026-11-30T23:59:59Z',
      capacity: 100,
      budget: 5000,
      status: 'PENDING_FACULTY_REVIEW',
      visibility: 'UNIVERSITY_WIDE',
      organizerName: 'Org',
      departmentName: 'Dept',
      venueName: undefined,
      venueLocation: undefined,
      activeRegistrationsCount: 0,
      isRegistered: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const noop = async () => {};

  test('renders pending event count', () => {
    render(
      <ApprovalQueue
        events={mockEvents}
        userRole="FACULTY_EVENT_COORDINATOR"
        userId="user1"
        onReview={noop}
        onReturn={noop}
        onApprove={noop}
        onReject={noop}
        onFetchHistory={async () => []}
      />
    );
    const countElement = screen.getByText(/Pending Actions/i);
    expect(countElement).toBeInTheDocument();
    expect(countElement).toHaveTextContent('1 Pending Actions');
  });
});
