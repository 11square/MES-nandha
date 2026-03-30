// Mock data for AttendanceTracking

export const mockWorkers = [
    { id: 1, name: 'Ramesh Kumar', role: 'Production Worker', team: 'Team A', shift: 'Morning', mobile: '+91 98765 11111' },
    { id: 2, name: 'Suresh Patel', role: 'Production Worker', team: 'Team A', shift: 'Morning', mobile: '+91 98765 22222' },
    { id: 3, name: 'Vijay Singh', role: 'Machine Operator', team: 'Team B', shift: 'Morning', mobile: '+91 98765 33333' },
    { id: 4, name: 'Prakash Reddy', role: 'Production Worker', team: 'Team B', shift: 'Morning', mobile: '+91 98765 44444' },
    { id: 5, name: 'Amit Sharma', role: 'Quality Control', team: 'Team A', shift: 'Evening', mobile: '+91 98765 55555' },
    { id: 6, name: 'Rajesh Kumar', role: 'Production Worker', team: 'Team C', shift: 'Morning', mobile: '+91 98765 66666' },
    { id: 7, name: 'Manoj Verma', role: 'Machine Operator', team: 'Team C', shift: 'Evening', mobile: '+91 98765 77777' },
    { id: 8, name: 'Sandeep Rao', role: 'Production Worker', team: 'Team B', shift: 'Evening', mobile: '+91 98765 88888' },
  ];

export const mockAttendanceData = [
    { worker_id: 1, present: true, check_in: '08:00', check_out: '17:00', hours: 9, remarks: '' },
    { worker_id: 2, present: true, check_in: '08:05', check_out: '17:10', hours: 9, remarks: '' },
    { worker_id: 3, present: true, check_in: '07:55', check_out: '17:05', hours: 9.17, remarks: '' },
    { worker_id: 4, present: false, check_in: null, check_out: null, hours: 0, remarks: 'Sick leave' },
    { worker_id: 5, present: true, check_in: '14:00', check_out: '22:00', hours: 8, remarks: '' },
    { worker_id: 6, present: true, check_in: '08:10', check_out: '17:00', hours: 8.83, remarks: '' },
    { worker_id: 7, present: true, check_in: '14:05', check_out: '22:15', hours: 8.17, remarks: '' },
    { worker_id: 8, present: true, check_in: '14:00', check_out: '22:00', hours: 8, remarks: '' },
  ];

