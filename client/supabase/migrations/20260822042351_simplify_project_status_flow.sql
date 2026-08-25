/*
# Simplify booking/project status flow

## Overview
Replaces the existing 7-step project workflow with the studio's actual simplified flow:
Enquiry → Confirmed → Event Completed → Editing → Delivered → Closed

## Changes
- Updates existing `bookings.project_status` values to map to the new flow.
- No structural schema changes — just data migration of status values.
- The `status` column (enquiry/quoted/confirmed/cancelled) stays as-is for booking lifecycle.
- The `project_status` column now uses: confirmed | event_done | editing | delivered | closed

## Mapping old → new
- confirmed → confirmed
- shoot → confirmed (will be set to event_done when shoot completes)
- editing → editing
- review → editing
- gallery → editing
- delivered → delivered
- completed → closed
*/

UPDATE bookings SET project_status = 'confirmed' WHERE project_status = 'shoot';
UPDATE bookings SET project_status = 'editing' WHERE project_status IN ('review', 'gallery');
UPDATE bookings SET project_status = 'closed' WHERE project_status = 'completed';
