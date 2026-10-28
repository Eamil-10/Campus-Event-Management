import React from 'react';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { EventCalendar } from '../EventCalendar';
import { EventItem } from '../../types/event';

describe('EventCalendar component', () => {
  const mockEvents: EventItem[] = [
    {
      id: 'e1',
      universityId: 'u1',
      organizerId: 'org1',
      organizationId: null,
      departmentId: 'dept1',
      venueId: null,
      title: 'Sample Event',
      description: 'Sample description',
      category: 'TECHNICAL',
      startTime: '2026-12-01T10:00:00Z',
      endTime: '2026-12-01T12:00:00Z',
      registrationDeadline: '2026-11-30T23:59:59Z',
      capacity: 50,
      budget: 2000,
      status: 'APPROVED',
      visibility: 'UNIVERSITY_WIDE',
      organizerName: 'Organizer',
      departmentName: 'Dept',
      venueName: undefined,
      venueLocation: undefined,
      activeRegistrationsCount: 0,
      isRegistered: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  test('renders calendar with event', () => {
    render(<EventCalendar events={mockEvents} />);
    const title = screen.getByText(/Sample Event/i);
    expect(title).toBeInTheDocument();
  });
});
