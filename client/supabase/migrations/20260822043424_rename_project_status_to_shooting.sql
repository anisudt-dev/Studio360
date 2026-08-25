-- Rename project_status: event_done → shooting, closed → delivered
UPDATE bookings SET project_status = 'shooting' WHERE project_status = 'event_done';
UPDATE bookings SET project_status = 'delivered' WHERE project_status = 'closed';
